# 设置改为全局浮层以保留下层页面状态

## Goal

将「设置」从独立路由页改造为右侧抽屉式全局浮层，使打开设置时下层页面不卸载、状态保留；关闭后回到原页面继续之前的状态。

## Background

- 现状：设置是 `app/settings/page.tsx` 独立路由，入口 `UserMenu`（`components/layout/UserMenu.tsx`）与 `PlayerNavbar`（`components/player/PlayerNavbar.tsx`）用 `<Link href="/settings">` 跳转。
- 问题：Next.js App Router 路由切换卸载原页面组件，导致搜索结果、播放进度、滚动位置等本地状态丢失，返回时整页重建。
- `useSettingsPage` 的本地 state 是 `settingsStore` 的镜像（每次改动立即 `saveSettings` 持久化），浮层 unmount 不丢数据，适合改为浮层。

## Requirements

- 设置以右侧抽屉（Drawer）浮层形式打开，覆盖在当前页面之上。
- 打开/关闭设置时，下层页面组件不卸载，状态（搜索、播放、滚动等）保留。
- 入口（用户菜单、播放器导航栏）点击即打开浮层，不再跳转路由。
- 复用现有 `settingsStore` 与 `useSettingsPage`，设置读写行为不变。
- 无障碍：focus trap、Escape 关闭、点击遮罩关闭、body 滚动锁、焦点回归触发元素。
- 废弃 `/settings` 路由（已确认接受旧链接 404）。

## Constraints

- 仅改 Web（`app/`、`components/`、`lib/`）；android-tv、apple-tv 原生工程不在范围。
- 不改动 `useSettingsPage` 内的 `window.location.reload()` 调用（导入/重置的现有重载行为保持，本次不优化）。
- 不改动 `Modal.tsx` 对外行为（避免影响其他对话框）。
- 最小 diff、易回滚。

## Acceptance Criteria

- [ ] 在首页/播放页点击「设置」入口，抽屉从右侧滑出，下层页面未卸载（状态保留）。
- [ ] 关闭抽屉（Escape / 点击遮罩 / 关闭按钮）后，下层页面状态仍在（搜索结果、滚动位置、播放进度不丢）。
- [ ] 抽屉内各设置分区（账号/播放器/显示/源/弹幕/排序/数据）功能正常，增删改源、导入导出、重置等行为与改造前一致。
- [ ] 抽屉内打开子 Modal（添加源/导入/导出/确认）层级正确，不被抽屉遮挡，关闭后焦点回归。
- [ ] `/settings` 路径返回 404（路由已移除），代码无残留引用。
- [ ] 移动端与桌面端布局正常，抽屉可纵向滚动。
- [ ] lint / type-check / 现有测试通过。
