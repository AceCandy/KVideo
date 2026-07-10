# 技术设计：设置改为右侧抽屉浮层

## 架构概览

新增全局挂载的 `SettingsDrawer` 组件 + 轻量 UI 状态 store 控制开闭；入口由路由 Link 改为按钮触发 `openSettings()`；废弃 `/settings` 路由。

```
app/layout.tsx (PasswordGate 内)
  └── <SettingsDrawer />          # 全局挂载，读 settings-ui-store.isOpen
        └── useSettingsPage()     # 复用现有 hook（迁移到 components/settings/hooks/）
              └── SettingsHeader / AccountSettings / PlayerSettings / ... / 子 Modals

lib/store/settings-ui-store.ts    # zustand: isOpen, openSettings(), closeSettings()

入口:
  UserMenu.tsx      <Link href="/settings">  →  <button onClick={openSettings}>
  PlayerNavbar.tsx  <Link href="/settings">  →  <button onClick={openSettings}>
```

## 组件与契约

### 1. `lib/store/settings-ui-store.ts`（新增）

- zustand store，非持久化（纯 UI 开关）。
- state: `isOpen: boolean`
- actions: `openSettings()`, `closeSettings()`, `toggleSettings()`
- 不混入 `settings-store`（后者是持久化设置数据，职责分离）。

### 2. `components/settings/SettingsDrawer.tsx`（新增）

- `'use client'`
- 读 `settings-ui-store` 的 `isOpen` / `closeSettings`；`isOpen` 为 false 时 `return null`。
- 结构：
  - `<ModalBackdrop isOpen={isOpen} onClose={closeSettings} />`（复用现有组件，点击遮罩关闭）
  - 容器：`fixed top-0 right-0 h-full w-full sm:max-w-md z-[var(--z-modal)] overflow-y-auto` + 右滑进入动画
  - 内部渲染原 `app/settings/page.tsx` 的 JSX（`SettingsHeader` + 各分区 + 子 Modals），调用迁移后的 `useSettingsPage()`
- 无障碍：focus trap、Escape 关闭、body 滚动锁、焦点回归触发元素——参考 `Modal.tsx` 实现，**复制其 `useEffect` 逻辑，不修改 `Modal.tsx`**。
- 关闭按钮：`SettingsHeader` 的「返回上一页」改为 `closeSettings()`。

### 3. `app/settings/page.tsx`（删除）

- 路由废弃，其 JSX 内容迁移到 `SettingsDrawer`。

### 4. hook 迁移：`app/settings/hooks/useSettingsPage.ts` → `components/settings/hooks/useSettingsPage.ts`

- 与现有 `components/settings/hooks/useAddSourceForm.ts` 位置一致，避免 `app/` 下残留非路由模块。
- 内容不变，仅迁移路径。

### 5. 入口改造

- `components/layout/UserMenu.tsx`：`<Link href="/settings">设置</Link>` → `<button onClick={openSettings}>设置</button>`，清理未用的 `next/link` import。
- `components/player/PlayerNavbar.tsx`：`<Link href="/settings">` → `<button onClick={openSettings}>`，按需清理 `Link` import（若该文件其他位置仍用 Link 则保留）。

### 6. 全局挂载

- `app/layout.tsx`：在 `PasswordGate` 内、`<ScrollPositionManager />` 旁加 `<SettingsDrawer />`。
- 该位置可访问 TV / Theme / Locale / RuntimeFeatures / auth 上下文，与原 settings 页一致。

## 数据流

- 开闭：入口按钮 → `openSettings()` → `isOpen=true` → `SettingsDrawer` 渲染。
- 设置读写：`SettingsDrawer` → `useSettingsPage` → 本地 state 镜像 `settingsStore` → 修改即 `saveSettings` 持久化。
- 关闭：Escape / 遮罩 / 按钮 → `closeSettings()` → `isOpen=false` → `SettingsDrawer` unmount（本地 state 丢失，但已持久化；下次打开 `syncFromStore` 重建）。

## 权衡与决策

- **Drawer vs Modal**：用户选定右侧抽屉。设置内容长，纵向滚动，移动端友好，贴合「上层浮层」语义。
- **focus trap 复用**：不抽公共 hook、不改 `Modal.tsx`，在 `SettingsDrawer` 内复制约 30 行 focus trap 逻辑。代价是少量重复，换来改动隔离与低风险（符合「diff 小、易回滚」）。未来可抽 `useDialogFocusTrap` 统一。
- **废弃 vs 重定向路由**：用户选定废弃。旧 `/settings` 链接 404，可接受。
- **导入/重置的 reload**：`useSettingsPage` 内 `window.location.reload()` 保持不变。重载会刷新下层页面（丢失其状态），但这是用户主动触发「导入/重置」的既有行为，本次不优化，仅标注。
- **hook 迁移**：把 `useSettingsPage` 移到 `components/settings/hooks/`，避免 `app/` 残留非路由模块，与现有 hook 位置一致。

## 兼容性与风险

- **嵌套 Modal 层级**（重点验证）：Drawer 容器带 `z-[var(--z-modal)]` 会形成 stacking context，内部子 Modal（AddSourceModal / ImportModal / ExportModal / ConfirmDialog）也用 `z-[var(--z-modal)]`。需验证子 Modal 的遮罩与面板在 Drawer 内正确覆盖、关闭后焦点回归。若同层冲突，给 Drawer 容器用更低 z（新增 `--z-drawer` 低于 `--z-modal`），使子 Modal 自然在其上。
- **TV 焦点导航**：项目有 `TVNavigationInitializer`，方向键导航。Drawer 的 focus trap 应已覆盖键盘用户；Web TV 场景需手动验证（TV 设备通常用原生 app，本任务范围仅 Web）。
- **body 滚动锁**：Drawer 与子 Modal 都会锁 `body.overflow`，关闭时需正确释放（参考 `Modal.tsx` cleanup）。
- **SettingsHeader 改造**：移除 `useRouter`，改用 `closeSettings`，避免抽屉内 `router.back()` 误导航。

## 回滚

- 改动集中：新增 store + 新增 Drawer + 迁移 hook + 改 2 个入口 + 删 `page.tsx` + layout 挂载。
- 回滚：`git revert` 单次提交即可恢复路由页与入口；hook 迁移用 `git mv` 记录，回滚清晰。
