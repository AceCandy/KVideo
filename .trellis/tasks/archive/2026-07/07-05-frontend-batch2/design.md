# Design — 前端批次2

## 改动总览

| 项 | 文件 | 性质 |
|---|---|---|
| R1 Error Boundary | 新增 `app/global-error.tsx`、`app/error.tsx` | 新增 2 文件 |
| R2 DanmakuCanvas | `components/player/DanmakuCanvas.tsx` | effect 依赖收敛 + ref |
| R3 store 双订阅 | `lib/store/{favorites,history,search-history}-store.ts` + `FavoriteButton` | helper + 消费者 selector |
| R4 loadMore 接通 | `app/page.tsx`、`components/home/SearchResults.tsx`（可能含 `VideoGrid`） | 透传 + 渲染触发器 |
| R5 搜索 error 态 | `lib/hooks/useSearchState.ts`、`lib/hooks/useSearchAction.ts`、`app/page.tsx`、可能 `NoResults` | 新增 error 字段 + 分支 |

## R1 — Error Boundary

- `app/error.tsx`：client component（`'use client'`），`default export` 一个 React 组件，实现 `componentDidCatch`/`getDerivedStateFromError`（或函数组件 + `react-error-boundary`，但项目无该依赖，手写 class 或 useState）。接收 `error`/`reset` prop（Next.js App Router 约定：`reset()` 重置错误边界）。展示友好文案 + "重试"按钮调用 `reset()`。复用 Liquid Glass 视觉（glass card 居中）。
- `app/global-error.tsx`：处理 root layout（`app/layout.tsx`）抛错，**必须自带 `<html><body>`**（Next.js 约定），因为它替换整个 root。同样提供"重试"。
- 不引入第三方依赖，手写最小 error boundary。

## R2 — DanmakuCanvas rAF 收敛

现状（`DanmakuCanvas.tsx:271`）：主循环 `useEffect(..., [isPlaying, currentTime, opacity, fontSize, spawnComments])`。

- 新增 `currentTimeRef`，在单独的小 effect（或 line 84 既有 `[currentTime]` effect）里同步 `currentTimeRef.current = currentTime`。
- 主循环 effect 依赖改为 `[isPlaying, opacity, fontSize, spawnComments]`，内部 `animate` 读 `currentTimeRef.current`。
- 暂停态（`!isPlaying`）：不启动 rAF（或重绘一帧后停止），消除空转重绘。
- 勿动 line 84 的 `[currentTime]` effect（负责 seek 清空弹幕），那是独立逻辑。
- `spawnComments` 若依赖闭包内的 `currentTime`，改为读 ref。

## R3 — store 双订阅消除

现状：`useFavorites(isPremium)` 无条件 `useFavoritesStore()` + `usePremiumFavoritesStore()`。

- **首选局部修复**：让高频消费者（`FavoriteButton`）不再经 helper 拿整个 store，改用 Zustand selector 只订阅自身 `isFavorite(videoId)` 的布尔切片 —— 该切片仅在"这一项的收藏状态"变化时才变，无关卡片的 `FavoriteButton` 不再 re-render。
- helper `useFavorites`/`useHistory`/`useSearchHistory` 改为按 `isPremium` 选择单一 store 的 vanilla api + `useStore(api, selector)`（Zustand 允许动态传 store api 给 `useStore`，不违反 hooks 规则），消除"无条件双订阅"。
- 实现时读 `createFavoritesStore` 返回类型（hook 还是含 vanilla api）与 `FavoriteButton` 现有用法，选择最小侵入路径。若 helper 重构波及过多调用方，回退为"仅 FavoriteButton 局部 selector"。

## R4 — 搜索 loadMore 接通

- `useParallelSearch` 已返回 `loadMore/hasMore/loadingMore`，`useHomePage`（line 174-177）已透传。`app/page.tsx:63-70` 未传给 `SearchResults`。
- 改：`page.tsx` 把三者传入 `SearchResults`；`SearchResults` 接收 prop 并在 `VideoGrid` 末尾渲染"加载更多 (剩余)"触发器（`hasMore` 为真时显示，点击 `loadMore`，`loadingMore` 时显示 loading）。
- 复用既有 `useInfiniteSlice`/`useInfiniteScroll` 模式（若 VideoGrid 已有无限滚动 hook，接入 `loadMore` 作为 fetchMore）。
- 确认 `loadMore` 的 abortController 不与主搜索互斥（审查提示）；若共用，本批仅接通透传，abort 互斥问题在 implement 标注。

## R5 — 搜索失败与无结果分离

- `useSearchState` 增加 `error: string | null`（若已有则复用）。
- `useSearchAction` 的 `onError`（line 131）与 `catch`（line 137-145）写入 `setError(message)`（AbortError 不计入 error）；成功时清 `error`。
- `app/page.tsx:80-82` 渲染分支：
  - `error` 非空 → 显示失败 UI（"搜索失败，请重试" + 重试按钮，重试调 `search(query)`）。
  - `!loading && hasSearched && results.length === 0 && !error` → 现有 `NoResults`。
- 复用现有 `NoResults` 组件结构，或新增一个 `SearchError` 内联块；倾向内联以减少新文件。

## 关键决策

1. **R3 首选局部**：helper 重构波及面大，优先 FavoriteButton selector（解决 90% re-render），helper 层"消除双订阅"用 `useStore(api, selector)` 动态选 store。
2. **R1 不引第三方**：手写最小 error boundary，避免新依赖。
3. **R5 error 内联渲染**：不新建 SearchError 组件，page.tsx 内联分支，减少文件。

## 验证

- `npx tsc --noEmit`；`npm test`（现有 + 任何可加的 store selector 单测）。
- 手动：构造抛错组件验证 error boundary；播放弹幕观察 rAF 不重建（DevTools Performance 或行为观察）；收藏切换观察只有目标卡片重渲染；搜索多页加载更多；断网搜索看 error 态。

## 回滚

- R1/R4/R5 新增/分支，独立可 revert。
- R2 改动单文件，可整体 revert。
- R3 若 helper 重构出问题，revert 到"仅 FavoriteButton 局部 selector"。
