# 执行计划：设置改为右侧抽屉浮层

## 顺序与验证

1. **新建 UI store** → `lib/store/settings-ui-store.ts`
   - 验证：`openSettings/closeSettings/isOpen` 可被 import；type-check 通过。

2. **迁移 hook** → `app/settings/hooks/useSettingsPage.ts` 移到 `components/settings/hooks/useSettingsPage.ts`（`git mv`）
   - 验证：`rg "app/settings/hooks/useSettingsPage"` 无残留引用。

3. **新建 SettingsDrawer** → `components/settings/SettingsDrawer.tsx`
   - 复用 `ModalBackdrop`；复制 `Modal.tsx` 的 focus trap / Escape / scroll lock / focus restore 逻辑。
   - 容器：`fixed top-0 right-0 h-full w-full sm:max-w-md z-[var(--z-modal)] overflow-y-auto` + 右滑动画。
   - 内容：搬入原 `app/settings/page.tsx` 的 JSX，调用迁移后的 `useSettingsPage`。
   - 验证：type-check；手动开闭无报错。

4. **改造 SettingsHeader** → 「返回上一页」按钮 `router.back()` 改为 `closeSettings()`，移除 `useRouter`。
   - 验证：type-check；点击关闭抽屉。

5. **改入口** →
   - `UserMenu.tsx`：`<Link href="/settings">` → `<button onClick={openSettings}>`，清理未用 import。
   - `PlayerNavbar.tsx`：同上。
   - 验证：`rg "href=['\"]/settings['\"]"` 无残留（除已删 page）。

6. **全局挂载** → `app/layout.tsx` PasswordGate 内加 `<SettingsDrawer />`。
   - 验证：首页可打开抽屉。

7. **删除路由** → `app/settings/page.tsx`；若 `app/settings/` 空则删目录。
   - 验证：访问 `/settings` 返回 404；`rg "/settings"` 无代码引用。

8. **质量检查** →
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npm test`
   - 手动走验收清单。

## Review Gate（重点验证项）

- [ ] 下层页面状态保留（搜索结果 / 滚动 / 播放进度）。
- [ ] 嵌套子 Modal 层级正确（添加源 / 导入 / 导出 / 确认），焦点回归。
- [ ] Escape / 遮罩 / 关闭按钮三种关闭方式。
- [ ] 移动端 + 桌面端布局与滚动。
- [ ] `/settings` 404，无残留引用。

## 回滚点

- 每步可独立提交；如嵌套 Modal 层级无法解决，`git revert` 回到路由版。

## 验证命令

- lint: `npm run lint`
- type-check: `npx tsc --noEmit`
- test: `npm test`
- 手动: `npm run dev` 后走验收清单
