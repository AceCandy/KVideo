# HLS 播放失败自动换源

## Goal

当某条源在 HLS 播放阶段发生 fatal error（重试 + 代理重试均用尽后仍无法恢复），自动切换到下一个候选源继续播放并保留进度；所有候选源都失败时显示统一错误，不死循环。

## Background

- 当前 fatal error 链路：`useHlsPlayer.ts:183` → `onError` → `CustomVideoPlayer` → `VideoPlayer.handleVideoError`（`VideoPlayer.tsx:136`）→ 仅代理重试一次 → 显示 `VideoPlayerError`。
- 已有换源能力 `handleSourceUnavailable`（`page.tsx:102`）：从 groupedSources 选 latency 最低的备用源 `router.replace`。但它：(1) 只被 detail 阶段失败触发；(2) 没有"已试过"集合，连续失败会反复跳回最快源形成死循环；(3) 不带播放进度 `t`。
- hls.js 内部已有 network/media 各 3 次重试（`useHlsPlayer.ts:179`），不应在这些重试用尽前换源。

## Requirements

- HLS fatal error 经重试 + 代理重试仍失败 → 触发自动换源（复用 `handleSourceUnavailable`）。
- 换源维护"本次会话已尝试源"集合（session 级，按 title+episode 维度），从**未试过**的候选源里选 latency 最低的；全部试过 → 显示统一错误页，不再换源。
- 换源时带上当前播放进度（`t` 参数），新源从该进度续播。
- 用户手动选源后若仍 fatal，也触发自动换源（默认决策，见 parent 待拍板项 1）。
- 换源过程给可见提示，避免黑屏困惑。

## Constraints

- 不改 hls.js 内部重试次数与策略。
- 不破坏现有代理重试（`proxyMode === 'retry'`）逻辑。
- tried 集合在切换 title/episode 后重置。

## Acceptance Criteria

- [ ] 选一个 detail 成功但 m3u8 失效的源 → 不再停在错误页，自动跳到下一个可播源并播放。
- [ ] 自动换源后播放进度接续（非从头）。
- [ ] 所有候选源都失败 → 显示统一错误页（不无限跳转、不回到已失败源）。
- [ ] 手动点选某个源，若它 fatal，行为符合 parent 决策项 1（默认自动换）。
- [ ] 切换到别的剧/集，tried 集合重置，可重新尝试所有源。
- [ ] lint / type-check 通过。
