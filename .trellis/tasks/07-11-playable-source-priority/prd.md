# 播放页优先选择可播放源并自动切换

## Goal

让播放页"延迟低 ≠ 能播"的问题得到根治：源列表优先展示并默认首选"真能播放"的源；当某条源在 HLS 播放阶段失败时（当前唯一会卡死的场景），自动切换到下一个候选可播源，而不是停在错误页。

## Background

- 现状：源测试延迟（`/api/ping`）只 HEAD 源站 `baseUrl`，代表"源站活着"，不代表"这条 m3u8 能播"。
- 现有自动换源（`handleSourceUnavailable`，`app/player/page.tsx:102`）只在 detail 接口阶段失败时触发（`useVideoPlayer.ts:97`）；HLS 播放阶段 fatal error 只调 `onError` 显示错误页（`useHlsPlayer.ts:183` → `VideoPlayer.handleVideoError`），不会换源。
- 源列表排序只按延迟（`SourcePanel.tsx:72`），没有"可播性"维度。
- 已有 `/api/probe-resolution` 在服务器端 fetch m3u8 manifest（`probe-resolution/route.ts:128`），"manifest 能否拿到"是现成的可播性信号，但当前只用于取分辨率，未用于排序/选源。

## 任务地图（parent 不直接实现，由两个 child 交付）

| Child | 交付物 | 独立验证 |
|---|---|---|
| `07-11-auto-switch-on-playback-error` (B) | HLS 播放失败自动换源 + 防死循环 + 保留进度 | 选不可播源 → 自动跳到可播源；全部不可播 → 统一错误 |
| `07-11-source-sort-by-playable` (C) | probe 返回可播性 + 源列表按"可播优先、延迟次之"排序 | 源列表把能取到 manifest 的源排前面 |

执行顺序：先 B（见效快、风险低），再 C。两者改动文件不重叠（仅 `page.tsx` 不同位置），可独立实现/验证/归档。

## 跨子任务验收（parent 集成）

- [ ] 选一个延迟低但 m3u8 失效的源进入播放 → 自动换到下一个可播源并继续播放（B）。
- [ ] 源列表默认把"probe 判定可播"的源排在不可播源之前（C）。
- [ ] 自动换源不破坏播放进度（带 `t` 续播）、不死循环（已试过的源不重复试）。
- [ ] 手动选源仍可用；probe 误判（假不可播）的源仍能手动点开播放。
- [ ] lint / type-check / 现有测试通过。

## 待 review 拍板的产品决策

1. **自动换源是否对"用户手动选的源"也生效**？默认：是（核心诉求是能播）。代价：用户手动选了一个明知可能失效的源，也会被自动跳走。
2. **防死循环终止**：所有候选源都试过仍失败 → 显示统一错误页 + 手动重试。默认如此。
3. **不可播源的 UI**：在源列表标记小灰标（如"不可播"），仍可点击。默认如此。

## Constraints

- 仅改 Web（`app/`、`components/`、`lib/`）。android-tv / apple-tv 不在范围。
- 不改 `/api/ping` 的语义（延迟测试保持现状，避免影响其他依赖）。
- C 复用已有 probe 请求，不新增接口；仅扩展返回字段。
- 最小 diff、易回滚。
