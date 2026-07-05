# 前端批次3b：播放器进度条与音量条 slider 无障碍

## Goal

让桌面播放器的进度条与音量条这两个自定义 `<div>` slider 对键盘与屏幕阅读器可用：可键盘聚焦、可用方向键调节、暴露正确的 `role="slider"` 与 `aria-value*` 语义、焦点可见。

## Background

- 现状：`DesktopProgressBar` 与 `DesktopVolumeControl` 的轨道是 `<div class="slider-track">` + 鼠标/触摸事件（`useProgressControls` / `useVolumeControls`），**无 `role`、无 `tabIndex`、无 `onKeyDown`、无 `aria-value*`**。键盘用户无法调节进度/音量，屏幕阅读器不识别为滑块。
- seek / setVolume 的原子逻辑已存在于两个 hook 内（被 mouse handler 包裹），可低成本提取为 value-based 入口供键盘路径复用。
- 速度菜单（`DesktopSpeedMenu`）的 `getBoundingClientRect` 用于按钮定位，不是 slider，不在范围内。

## Requirements

### R1 `useProgressControls` 新增 `seekTo(time)`
- clamp 到 `[0, duration]`，设 `videoRef.current.currentTime`、`setCurrentTime`、`lastDragTimeRef`，导出。现有 mouse/touch handler 保持不变（surgical，不改动）。

### R2 `useVolumeControls` 新增 `setVolumeTo(v)`
- clamp 到 `[0,1]`，设 volume / muted / state / localStorage（与 `handleVolumeChange` 等价的写入），导出。现有 mouse handler 保持不变。

### R3 `DesktopProgressBar` 加无障碍
- 轨道节点：`role="slider"`、`tabIndex={0}`、`aria-label="播放进度"`、`aria-orientation="horizontal"`、`aria-valuemin={0}`、`aria-valuemax={Math.floor(duration)}`、`aria-valuenow={Math.floor(currentTime)}`、`aria-valuetext={formatTime(currentTime) / formatTime(duration)}`、`onKeyDown`。
- 键盘：ArrowRight/Up → +5s，ArrowLeft/Down → −5s，Home → 0，End → duration；`preventDefault` 防页面滚动。
- 新增可选 props：`onSeekByKey?: (seconds: number) => void`、`formatTime?: (s: number) => string`。

### R4 `DesktopVolumeControl` 加无障碍
- 轨道节点同上语义：`aria-label="音量"`、`aria-valuemin={0}`、`aria-valuemax={1}`、`aria-valuenow`、`onKeyDown`。
- 键盘：ArrowRight/Up → +5%，ArrowLeft/Down → −5%，Home → 0，End → 100%；`preventDefault`。
- 新增可选 prop：`onVolumeByKey?: (volume: number) => void`。
- 仅在 `showVolumeBar`（展开态）时给 `tabIndex`，避免折叠态下不可见的滑块进入 tab 序列。

### R5 Prop drilling 接通
- `DesktopControls` 透传 `onSeekByKey` / `formatTime` 给 `DesktopProgressBar`。
- `DesktopLeftControls` 透传 `onVolumeByKey` 给 `DesktopVolumeControl`。
- `DesktopVideoPlayer` 用 `seekTo` / `setVolumeTo` 构造 `onSeekByKey` / `onVolumeByKey` 并下传。

### R6 CSS 焦点样式
- `app/styles/video-player.css` 给 `.slider-track:focus-visible` 加 `outline`（`var(--accent-color)`）+ `outline-offset`，保证键盘焦点可见；不影响鼠标/触摸交互。

### R7 spec 沉淀
- 在 `.trellis/spec/frontend/` 记录：自定义 slider 必须满足 `role=slider + tabIndex + aria-value* + onKeyDown`，键盘步进约定（进度 5s / 音量 5%），折叠态 slider 不进 tab 序列。

## Out of Scope

- 移动端播放器（触摸交互，无键盘场景）。
- 速度菜单、字幕、清晰度等其他控件。
- 通用 `<Modal>` 重构、`--radius-*` token 改名（批次 3 其余子项）。

## Acceptance Criteria

- [ ] 进度条与音量条可 Tab 聚焦，聚焦时有可见 outline。
- [ ] 方向键可调节进度（±5s）/ 音量（±5%），Home/End 到端点；操作不触发页面滚动。
- [ ] 轨道 DOM 暴露 `role="slider"` 与正确的 `aria-valuemin/max/now(/valuetext)`。
- [ ] 音量条折叠态（`showVolumeBar=false`）不进入键盘 tab 序列。
- [ ] 现有鼠标/触摸拖动行为不受影响（不改 mouse/touch handler 内部逻辑）。
- [ ] `npx tsc --noEmit` 通过；改动文件 eslint 无新增告警。
- [ ] spec 增补自定义 slider 无障碍约定。

## Risks

- prop drilling 链路较长（4 个组件 + 2 个 hook），逐层加可选 prop，类型缺失会被 tsc 捕获。
- `aria-valuetext` 依赖 `formatTime`：若某层未透传则降级为不渲染 valuetext（屏幕阅读器仍读 valuenow 秒数），功能不阻断。
- 键盘行为无法在此环境端到端验证（需浏览器），以 typecheck + 代码审查 + 与原生 `<input type=range>` 键盘约定对齐为准。
