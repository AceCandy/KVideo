# 技术设计：源列表按可播性优先排序

## 架构概览

probe-resolution 在已有 manifest fetch 基础上多返回一个 `playable` 布尔；hook 透出 playable map；SourcePanel 排序加一档"不可播下沉"权重，当前源豁免。

```
/api/probe-resolution  probeOne
   manifest fetch 成功 → playable:true（顺带 resolution）
   manifest fetch 失败 → playable:false
        ↓ SSE
useResolutionProbe  → { resolutions, playable, isProbing }
        ↓ page.tsx 透传
SourcePanel.sortedSources
   权重: [ isCurrent?0 : playable===false?1 : 0, latency ]
```

## 组件与契约

### 1. `/api/probe-resolution`（`app/api/probe-resolution/route.ts`）

- `probeOne` 返回值新增 `playable: boolean`：
  - `fetchManifestText(targetUrl, 8000)`（route.ts:128）成功 → `playable=true`。
  - 进入其 catch（route.ts:131）→ `playable=false`。
  - detail 无 episodes / 无 targetUrl → `playable=false`。
- SSE 事件 payload 加 `playable`；done 事件不变。

### 2. `useResolutionProbe`（`lib/hooks/useResolutionProbe.ts`）

- `ResolutionProbeEvent` 加 `playable?: boolean`。
- 新增 state `playable: Record<string, boolean>`，按 `source:id` 写入。
- 返回值 `{ resolutions, playable, isProbing }`。
- playable 不缓存到 resolution-cache（即时网络可达性，过期快）。

### 3. `SourcePanel`（`components/player/episode-list/SourcePanel.tsx`）

- 新增 prop `sourcePlayables?: Record<string, boolean>`（page 从 useResolutionProbe 透传）。
- probeKey 复用现有 `${source.source}:${source.id}`。
- `sortedSources` 排序键改为：
  - 当前源（`s.source === currentSource`）：第一权重 0（豁免下沉）。
  - `playable === false`：第一权重 1（沉底）。
  - `playable === true` 或未知（undefined）：第一权重 0。
  - 第二权重统一为 latency。
- useMemo 依赖加入 `sourcePlayables`，probe 结果回流自动重排。

### 4. `SourceRow`（`components/player/episode-list/SourceRow.tsx`）

- 新增 prop `unplayable?: boolean`；为 true 时显示小灰标"不可播"，行样式轻微置灰，`onClick` 不变（仍可点）。

### 5. `app/player/page.tsx` 透传

- `useResolutionProbe` 解构 `playable`，传入 `<EpisodeList>` / `<SourcePanel>` 的 `sourcePlayables`。

## 数据流

- probe SSE → hook playable map → SourcePanel 排序 → SourceRow 标记。
- playable 异步到达：初始全未知按 latency 排，结果回流后重排。

## 权衡与决策

- **未知 ≠ 不可播**：未 probe 完 playable 为 undefined，按 latency 正常排，避免首源因 probe 慢被埋；只有明确 false 才下沉。
- **当前源豁免**：正在播/刚选的源即使 probe false 也不下沉，避免列表当前项乱跳。
- **不缓存 playable**：网络可达性时效短，缓存易误导；resolution 仍照旧缓存。
- **误判容忍**：服务器端 probe 可能因 UA/IP 拿不到 manifest 误判 false；因 false 只影响排序/标记、不阻止手动点，代价可接受。

## 兼容性与风险

- **probe 速率限制（10/min）**：源多时部分 probe 429，其 playable 保持 undefined（不下沉，按 latency），不误判为不可播，符合"未知不下沉"。
- **manifest 需 Referer 的源**：服务器端不带 Referer 可能拿不到 → playable=false；浏览器端通常同样拿不到 → 多数判定正确；少数误判由"仍可手动点"兜底。
- **排序抖动**：probe 结果分批到达，列表会重排几次（现有 resolution probe 已有同样行为，可接受）。

## 回滚

- 改动：route 加字段、hook 加 map、SourcePanel 排序键、SourceRow 标记、page 透传。无新文件、无契约删除（playable 为可选字段，旧消费端忽略无害），`git revert` 即可。
