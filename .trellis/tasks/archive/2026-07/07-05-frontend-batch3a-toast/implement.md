# Implement — 全局 toast 基建

## 顺序与验证

1. **新建 `lib/store/toast-store.ts`**
   - `createStore` 定义 state/actions；模块级 `seq` 生成 id；`MAX_TOASTS = 4`；`push` 内 `setTimeout` 自动 `dismiss`，`Map<id, timer>` 管理 timer，`dismiss` 时 `clearTimeout`。
   - 导出 `toastApi` 与 `toast` 便捷对象（success/error/info/warning）。
   - 验证：typecheck（API 形状正确）。

2. **新建 `components/ui/Toast.tsx`**
   - `ToastViewport` 订阅 `toasts`，空数组返回 null；`fixed top-4 ... z-[10000]`；每条 `role="status"` + 关闭按钮 + 按 type 着色；进入/出透明度 transition。
   - 验证：typecheck；手动调用 `toast.success('test')` 能渲染（接入后端到端验）。

3. **挂载到 `app/layout.tsx`**
   - `<PasswordGate>` 内 `<BackToTop />` 旁加 `<ToastViewport />`。
   - 验证：typecheck。

4. **接入 `FavoriteButton`**
   - `handleClick` 在 `toggleFavorite` 后按返回值弹 toast（含 title）。
   - 验证：typecheck。

5. **接入 `AddSourceModal`**
   - 包装 `onAdd` 为 `handleAdd`，成功后 `toast.success`；编辑场景文案区分。
   - 验证：typecheck。

6. **spec 沉淀**
   - `.trellis/spec/frontend/state-management.md` 增补 "Toast" 小节（调用方式、不持久化、z-index 高于 Modal、`role="status"`、后台静默任务不弹 toast）。

## 验证命令

- `npm run typecheck`（必过）
- `npm run lint -- --quiet`（改动文件无新增告警）

## 不做

- 不接入订阅刷新 / ImportModal / 其他 mutation（见 prd Out of Scope）。
- 不引入 Context Provider、不持久化、不加 i18n（文案直接中文，与现有 UI 一致）。
- 不做端到端浏览器验证（本地起服受端口与鉴权限制，沿用 batch1/2 的代码审查 + typecheck 保证）。

## 回滚点

- 每步独立；任意步出错可单独还原，不影响既有逻辑（纯新增 + 接入点小改）。
