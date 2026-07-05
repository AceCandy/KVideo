# 前端批次4b：激活 aria-live announcer 播报搜索状态

## Goal

激活 `app/layout.tsx` 中预留但从未写入的 `#aria-live-announcer`（polite sr-only live region），在并行搜索完成时为屏幕阅读器用户播报结果状态（找到 N 条 / 未找到），让 SR 用户不必逐项探索就知道搜索结局。

## Background

- 现状：`#aria-live-announcer` 是空 DOM，全项目无任何代码写入。`VideoPlayerError` / `app/error.tsx` 用局部 `aria-live="assertive"`；toast 用 `role="status"`。搜索是核心流程，但完成状态（尤其无结果）目前对 SR 用户不主动告知。
- `processSearchStream` 的 `onComplete` 回调里，`sourcesMap` 已汇总各源 count，可同步求和得到总结果数，是天然的播报接入点。

## Requirements

### R1 `announce` 工具（`lib/utils/aria-announce.ts`）
- 导出 `announce(message: string)`：客户端写入 `#aria-live-announcer` 的 `textContent`；SSR（无 `document`）安全跳过。
- 为保证屏幕阅读器对"连续相同消息"也能重播，先清空再于下一 tick（`setTimeout`）写入。

### R2 接入搜索完成（`lib/hooks/useSearchAction.ts`）
- 在 `processSearchStream` 的 `onComplete` 内，用已构造的 `sources` 求和 `totalFound`，调用 `announce`：`totalFound > 0` 报「搜索完成，找到 N 条结果」，否则报「未找到相关内容」。
- 不改 `setResults` updater、不改 `onError`（搜索失败已由 toast / 内联重试覆盖）。

### R3 不重复播报
- `NoResults` 组件**不**额外加 `role="status"`：无结果文案已由 announce 播报，避免双重播报。

### R4 spec 沉淀
- `.trellis/spec/frontend/` 增补 "Live Regions" 约定：跨组件/非视觉的关键状态用 `announce` 写入 `#aria-live-announcer`（polite）；组件自身即时反馈优先用 `role="status"`；两者不重叠。

## Out of Scope

- 搜索进行中（loading）的播报（高频打断，polite 也不宜每次进度更新播报）。
- loadMore 的播报（增量结果，SR 用户可探索结果区）。
- roving tabindex、字幕轨道（批次 4 其他子项）。

## Acceptance Criteria

- [ ] `announce` 在客户端写入 `#aria-live-announcer`，SSR 不报错。
- [ ] 搜索完成时，announcer 文本更新为结果状态消息（有结果报数量 / 无结果报未找到）。
- [ ] `NoResults` 不新增重复 live region。
- [ ] `npx tsc --noEmit` 通过；改动文件 eslint 无新增告警。
- [ ] spec 增补 Live Regions 约定。

## Risks

- polite live region 的播报时机与重复消息处理依赖 SR 实现：用「先清空再延迟写入」的通用技巧兜底，不在本环境端到端验证。
- 搜索完成每次播报可能略显频繁：polite 不会打断当前朗读，且只在完成时一次，可接受。
