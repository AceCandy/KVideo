# 源列表按可播性优先排序

## Goal

源列表排序从"只看延迟"改为"可播优先、延迟次之"，让首屏默认首选和列表顶部倾向"真能播放"的源；不可播源排到列表后部但仍可手动点击。

## Background

- `/api/probe-resolution` 已在服务器端 fetch m3u8 manifest（`route.ts:128` 的 `fetchManifestText`），成功才解析分辨率。"manifest 能否拿到"是现成的可播性信号，但当前结果只返回 resolution，未单独暴露 manifest 成功与否。
- `useResolutionProbe`（`lib/hooks/useResolutionProbe.ts`）消费 SSE，只产出 `resolutions` map。
- `SourcePanel.sortedSources`（`SourcePanel.tsx:72`）仅按 latency 排序。

## Requirements

- `/api/probe-resolution` 在每个 probe 结果中返回 `playable: boolean`（manifest fetch 成功 = true）。
- `useResolutionProbe` 暴露 `playable: Record<string, boolean>`（key = `source:id`）。
- `SourcePanel` 排序：`playable === false` 的源排到列表后部；`true` 与未知的按 latency 升序（未 probe 完的不被打入冷宫）。
- 当前正在播放的源不因 playable=false 下沉（用户正在看/刚选）。
- 不可播源在 `SourceRow` 标记小灰标（如"不可播"），仍可点击尝试。

## Constraints

- 不新增 API 接口，仅扩展 probe-resolution 返回字段。
- 不改 `/api/ping` 延迟语义。
- probe 速率限制（10/min，`route.ts:156`）是既有约束，本任务不增加请求数。
- playable 判定仅影响排序/默认首选/标记，绝不阻止用户手动点选。

## Acceptance Criteria

- [ ] probe-resolution 事件 payload 含 `playable` 字段。
- [ ] 源列表把能取到 manifest 的源排在取不到的之前（同延迟区间）。
- [ ] 未 probe 完的源不会因"还没结果"被排到最后。
- [ ] 当前播放源即使 playable=false 也保持在列表合理位置（不下沉到末尾）。
- [ ] 不可播源显示灰标且仍可点击播放。
- [ ] lint / type-check 通过。
