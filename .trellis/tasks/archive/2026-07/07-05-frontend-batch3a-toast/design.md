# Design — 全局 toast 基建

## 架构决策

**不引入 React Context Provider**。沿用 `favorites-store.ts` 的 vanilla `createStore` + `useStore(api, selector)` 范式：
- 调用点直接 `import { toast } from '@/lib/store/toast-store'`，无 Provider 包裹要求、无 hook 规则约束。
- 只有 `ToastViewport` 订阅 `toasts` 列表；触发 toast 的组件不订阅、不重渲染。

这与 batch2 在 `state-management.md` 沉淀的 "Store Subscriptions" 规则一致：触发方不订阅、消费方窄切片订阅。

## 模块边界

### `lib/store/toast-store.ts`
```
type ToastType = 'success' | 'error' | 'info' | 'warning';
interface Toast { id: string; type: ToastType; message: string; duration: number; }
interface ToastState { toasts: Toast[]; }
interface ToastActions {
  push(t: Omit<Toast,'id'> & { id?: string }): string;
  dismiss(id: string): void;
  clear(): void;
}
export const toastApi = createStore<ToastState & ToastActions>()((set, get) => ({ ... }));
export const toast = { success, error, info, warning }; // 便捷封装，内部调 push
```

- `push` 内部：生成 id（自增计数器，避免 `Math.random`/`Date.now` 在 SSR 不稳定 — 用模块级 `let seq = 0`）；`set` 加入新 toast 并裁剪到 `MAX_TOASTS`；用 `setTimeout(..., duration)` 调 `get().dismiss(id)`，把 timer 句柄存入模块级 `Map<id, timer>`，`dismiss` 时 `clearTimeout`。
- 默认 duration：`success/info/warning = 3000`、`error = 4000`；调用方可覆盖。
- 不持久化、不访问 `window`/`document`；`setTimeout` 仅在 push（客户端事件回调）执行时调用。

### `components/ui/Toast.tsx`
- `'use client'`。导出 `ToastViewport`。
- `const toasts = useStore(toastApi, s => s.toasts)`；空数组时返回 null（不渲染容器）。
- 容器：`fixed top-4 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2`。
- 单条：`role="status"`，左侧色条 / 图标按 type，右侧关闭按钮；进入用 `animate-in`（透明度 + translateY），退出同理。退出动画通过本地 `leaving` state 或保留 1 帧 transition 实现（见 implement 备选：先做透明度 transition，复杂退出动画不强制）。
- 图标复用 `components/ui/Icon` 的现有图标（若有 success/error 等），无则用内联 SVG。

### `app/layout.tsx`
- 在 `<BackToTop />` 旁加 `<ToastViewport />`，import 路径 `@/components/ui/Toast`。

## 接入改造

### `components/favorites/FavoriteButton.tsx`
- import `toast`。
- `handleClick` 内 `toggleFavorite` 后，依据返回值（`true=已收藏 / false=已取消`）弹 `toast.success`，message 含 `title`（过长截断 ~20 字）。
- duration 用 2500。

### `components/settings/AddSourceModal.tsx`
- import `toast`。
- 包装传入 `useAddSourceForm` 的 `onAdd`：
  ```
  const handleAdd = (source) => { onAdd(source); toast.success(isEditing ? '源已更新' : '源已添加'); };
  ```
  传 `onAdd: handleAdd` 给 hook。校验失败仍由 hook 内 `setError` 走内联红字，不变。

## 数据流

```
client event → toast.success(msg) → toastApi.push → set(toasts) → setTimeout(dismiss)
ToastViewport (订阅 toasts) → re-render → portal 显示
```

## 兼容性 / 回滚

- 纯新增模块 + 3 处小改（layout / FavoriteButton / AddSourceModal），不修改既有业务逻辑。
- 回滚：删除新文件，还原 3 处 import 与调用即可。无数据迁移、无 store 结构破坏。
- SSR 安全：store 模块顶层无副作用；`toast.*` 仅在客户端事件中调用。
