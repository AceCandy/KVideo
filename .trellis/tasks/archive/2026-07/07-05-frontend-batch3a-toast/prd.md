# 前端批次3a：全局 toast 基建与关键 mutation 反馈

## Goal

为应用建立统一的全局 toast 基建，并接入关键的用户主动 mutation（收藏切换、添加自定义源），让操作结果有即时、可见、可被辅助技术感知的反馈，替代当前部分流程"操作后无反馈"或"仅 console.error"的静默体验。

## Background

- 现状：`FavoriteButton` 切换收藏后只有图标动画，无文字反馈；`useAddSourceForm` 添加源成功后直接 `onAdd + onClose`，无成功提示，校验失败仅表单内联红字；`useSubscriptionSync` 后台同步失败仅 `console.error`。
- 项目已有 vanilla store + 切片订阅范式（`favorites-store.ts` 的 `createStore` / `useStore(api, selector)`），toast 基建沿用同一范式可零成本落地。
- `app/layout.tsx` 已有全局 `aria-live-announcer`（sr-only / polite）供其他场景使用；toast 自身通过 `role="status"` 独立满足无障碍播报，不复用也不污染该 announcer。

## Requirements

### R1 Toast 状态层（`lib/store/toast-store.ts`）
- 使用 `zustand` 的 `createStore` 创建 vanilla store `toastApi`，**不持久化**（toast 是瞬态的）。
- state 形态：`{ toasts: Toast[] }`；`Toast` 至少包含 `id`、`type`（`success | error | info | warning`）、`message`、`duration`。
- actions：`push(toast)` 返回 id、`dismiss(id)`、`clear()`。
- 自动过期：`push` 时按 `duration`（默认 3s，error 默认 4s）启动 `setTimeout` 调 `dismiss`；同 id 仅触发一次。
- 数量上限：堆叠最多 `MAX_TOASTS = 4`，超出移除最旧的一条（FIFO）。
- 暴露便捷对象 `toast.success/error/info/warning(message, options?)`，供任意客户端调用点直接 import，无需 hook 或 Context。

### R2 Toast 视图层（`components/ui/Toast.tsx`）
- 默认导出 `ToastViewport`：客户端组件，用 `useStore(toastApi, s => s.toasts)` 订阅，固定定位（视口顶部居中或右上），`z-index` 高于现有 Modal（现有 Modal 为 `z-[9999]`，toast 用 `z-[10000]`）。
- 每条 toast：`role="status"`，按 `type` 着色（success/绿、error/红、info/accent、warning/琥珀），使用现有 token（`--glass-bg`、`--glass-border`、`--accent-color`、`--text-color`、`--radius-*`），保留 liquid glass 风格。
- 支持手动关闭按钮；进入/退出有过渡（透明度 + 位移）。
- 无障碍：`role="status"` 隐含 `aria-live="polite"`，不重复添加全局 announcer。

### R3 挂载
- 在 `app/layout.tsx` 的 `<PasswordGate>` 内、与 `<BackToTop>` 同级挂载 `<ToastViewport />`，保证主交互区的所有客户端组件都能触发 toast。

### R4 接入点（验证基建可用）
1. **`FavoriteButton`**：`toggleFavorite` 后弹 toast（`已收藏「title」` / `已取消收藏`）；高频组件，duration 用较短默认（2.5s），且仅在用户主动点击时触发。
2. **`AddSourceModal`**：包装 `onAdd`，源添加成功后弹 `toast.success`（编辑场景对应「源已更新」）；表单校验失败仍走现有内联红字，不用 toast。

### R5 spec 沉淀
- 在 `.trellis/spec/frontend/state-management.md` 增补 "Toast" 小节：何时用 toast、调用方式（直接 import `toast`，不走 Context）、瞬态不持久化、z-index 高于 Modal、a11y 用 `role="status"`、后台静默任务（如订阅刷新）默认不弹 toast。

## Out of Scope

- 订阅刷新失败（`useSubscriptionSync`）的 toast：后台静默任务，弹 toast 违背其定位，保持 `console.error`。
- `ImportModal` 各 Tab 的导入结果反馈（分散且每 Tab 各异），留后续按需接入。
- 通用 `<Modal>` 重构、自定义 slider a11y、`--radius-*` token 改名：属批次 3 其余子项，另开任务。

## Acceptance Criteria

- [ ] `toastApi` 为 vanilla `createStore`，`toast.success/error/info/warning` 可在客户端任意位置调用并触发渲染。
- [ ] toast 自动过期、最多堆叠 4 条、可手动关闭。
- [ ] `ToastViewport` 在 `app/layout.tsx` 挂载，z-index 高于 Modal，过渡正常。
- [ ] 收藏切换与添加源成功均出现 toast 反馈；校验失败仍走原内联文案。
- [ ] `npm run typecheck` 通过；改动文件 lint 无新增告警。
- [ ] `state-management.md` 增补 Toast 约定。

## Risks

- toast-store 在 SSR 环境下若被服务端调用会报错 → 仅在客户端组件 / 事件回调中调用，`ToastViewport` 标 `'use client'`，store 模块本身不访问浏览器 API（`setTimeout` 在 push 调用时才创建，调用点天然在客户端）。
- `FavoriteButton` 是高频组件，toast 频繁可能打扰 → 较短 duration + 仅点击触发。
