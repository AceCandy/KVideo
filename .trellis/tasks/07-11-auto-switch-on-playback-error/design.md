# 技术设计：HLS 播放失败自动换源

## 架构概览

把 `handleSourceUnavailable` 升级为"播放阶段也能调用、带 tried 集合、带进度"的统一换源入口；`VideoPlayer` 在 fatal 错误（重试 + 代理重试均尽）后通过新回调触发它。

```
useHlsPlayer (fatal, 内部重试用尽)
  → onError(message)
  → VideoPlayer.handleVideoError
       代理重试一次仍失败 / 无代理重试
       → onPlaybackSourceUnavailable?.()         # 新增 prop
            → page.handleSourceUnavailable()
                 读 triedSet，选下一个未试过的源（按 latency）
                 全部试过 → 显示统一错误页
                 否则 router.replace(带 t)
```

detail 阶段换源（`useVideoPlayer`）与播放阶段换源（`VideoPlayer`）共用同一个"选下一个源"内核，且共享 tried 集合，避免 detail 换到 A、A 播放失败后又把 A 选回来。

## 组件与契约

### 1. tried 集合（`app/player/page.tsx`）

- `const triedSourcesRef = useRef<Set<string>>(new Set())`，存 source id。
- 维度按当前 title+episode；title/episode 变化时清空（在现有 `useEffect([videoId, source])` 旁新增 reset，或在换源内核入口按 `title+episode` 校验）。
- 进入页面时把初始 `source` 加入 tried（它是第一个要试的）。

### 2. 统一选源内核（重构 `handleSourceUnavailable`，`page.tsx:102`）

- 签名保留，供 detail 阶段（`useVideoPlayer`）与播放阶段（`VideoPlayer`）共用。
- 行为：
  1. `alternatives = groupedSources.filter(s => !triedSourcesRef.current.has(s.source))`
  2. 空集 → `setFinalError(true)`（保留现有 `pendingFallback` 兜底语义），return。
  3. 否则选 latency 最低的，加入 tried，`router.replace` 带：`id`、`source`、`title`、`episode`、`t=playerTimeRef.current`、`gs`。

### 3. `VideoPlayer` 新增回调（`components/player/VideoPlayer.tsx`）

- 新 prop：`onPlaybackSourceUnavailable?: () => void`。
- `handleVideoError` 改造：
  - 现有：`!effectiveUseProxy && proxyMode === 'retry'` → 代理重试一次。
  - 新增：代理已试过仍 fatal（用 `proxyTriedRef` 标记），或 `proxyMode` 为 `none`/`always` → 调 `onPlaybackSourceUnavailable?.()` 而非 `setVideoError`。

### 4. 接线（`app/player/page.tsx`）

- `<VideoPlayer onPlaybackSourceUnavailable={handleSourceUnavailable} />`。

### 5. 换源可见提示

- 换源走 `router.replace` → `useVideoPlayer` 重新 fetch → 现有 loading 态。
- 用 `isAutoSwitching` state（tried 非空且未到 finalError）把 loading 文案改为"正在尝试其他源…"。

## 数据流

- fatal → `handleVideoError` → 代理重试 / 换源分支。
- 换源：`router.replace` → 新 source → `useVideoPlayer` 重 fetch → 新 playUrl → `VideoPlayer` 按 `key` 含 source 重挂载 → 续播 `t`。
- tried 集合在 page 层 ref；`router.replace` 仅改 query，page 组件实例与 ref 保留。

## 权衡与决策

- **tried 用 ref 非 state**：不直接驱动渲染（排序/列表不依赖它），只供换源决策读；提示态用单独 `isAutoSwitching`。
- **detail 与播放换源共用内核**：避免两套"选下个源"分叉，tried 天然共享。
- **代理重试在前、换源在后**：代理成本低、可能救活；代理也失败再换源，保留 `proxyMode` 语义。
- **防死循环**：tried 保证每源只试一次；全试完进 finalError。

## 兼容性与风险

- **误切**（抖动 fatal）：hls.js 已有 network/media 各 3 次重试兜底，到换源已是真失败，可接受。
- **手动选源被自动换走**（parent 决策项 1）：若 review 决定不换，则在 `handleVideoError` 增加"本次是否手动选源"标记，手动选源只显示错误。
- **`t` 续播精度**：新源时间轴可能不同，`t` 仅近似初始位（现有 `getSavedProgress` 已处理）。
- **router.replace 不重置 page state**：需验证 query 切换不重置 page 的 ref（tried 生效前提）。

## 回滚

- 改动集中在 `page.tsx`（tried + 内核重构 + 传 prop + 提示）与 `VideoPlayer.tsx`（新 prop + handleVideoError 分支）。无新文件、无接口契约变更，`git revert` 即可。
