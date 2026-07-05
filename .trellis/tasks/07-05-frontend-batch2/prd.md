# 前端批次2：Error Boundary、弹幕循环、订阅泄漏、搜索loadMore与错误态

## Goal

修复全维度审查发现的前端 P0 体验与性能缺陷：补齐全局错误边界、收敛弹幕动画循环依赖、消除 store 双订阅泄漏、接通搜索多页加载、区分搜索失败与无结果。覆盖"功能写了没接上"的两条真 bug 与三条高频性能/健壮性短板。

## Background

审查（前端架构 agent + UE agent，已亲自复核取证）确认：

- 全项目无任何 React Error Boundary（无 `error.tsx`/`global-error.tsx`，无 `componentDidCatch`），任意未捕获错误整页白屏。
- `DanmakuCanvas` 主循环 `useEffect` 依赖含 `currentTime`（`DanmakuCanvas.tsx:271`），`currentTime` 由 `timeupdate` 高频驱动，导致 rAF 循环每秒被拆装重建、暂停态仍空转重绘。
- `useFavorites`/`useHistory`/`useSearchHistory` 三个 helper hook 无条件订阅 normal+premium 两个 store（`favorites-store.ts:127-130` 等），被 `FavoriteButton`（搜索网格里上百实例）共享，任意收藏变动引发全量 re-render。
- `useParallelSearch` 已返回 `loadMore/hasMore/loadingMore`，但 `app/page.tsx` 完全未透传给 `SearchResults` —— 用户永远只看到第 1 页。
- 搜索失败时 `useSearchAction` 的 `onError`/`catch` 只 `setLoading(false)`，无 error 态写入；`page.tsx` 把失败当作"未找到结果"渲染，误导用户换关键词、无重试入口。

## Requirements

- **R1 Error Boundary**：新增 `app/global-error.tsx`（root layout 错误边界，含 `<html><body>`）与 `app/error.tsx`（路由段错误边界），子组件未捕获异常不再导致整页白屏，提供"重试"入口。
- **R2 DanmakuCanvas rAF 循环收敛**：主循环 `useEffect` 依赖移除 `currentTime`，改由 ref 传递；暂停态停止 rAF 空转；rAF 句柄不再每秒拆装。
- **R3 store 双订阅消除（favorites 聚焦）**：`useFavorites` 不再无条件订阅 normal+premium 两个 store（改用 vanilla `createStore` api + `useStore` 动态选择单一 store）；`FavoriteButton`（搜索网格上百实例）改为细粒度 selector 只订阅自身 `isFavorite` 切片 + `toggleFavorite` action。`useHistory`/`useSearchHistory` 同模式但消费者少，留独立 follow-up。
- **R4 搜索 loadMore 接通**：`app/page.tsx` 将 `loadMore/hasMore/loadingMore` 透传给 `SearchResults`；`SearchResults`/`VideoGrid` 渲染"加载更多"触发器（复用既有 `useInfiniteSlice` 模式）。
- **R5 搜索失败与无结果分离**：`useSearchState` 增加 `error` 字段；`useSearchAction` 的 `onError`/`catch` 写入分类错误；`page.tsx` 区分 `error`（显示失败 + 重试）与真正的 zero-results（NoResults）。

## 不做（明确排除）

- 列表虚拟化（react-window）—— 独立性能任务。
- `ThemeContext` value `useMemo`、`useSettingsPage` setState 批处理、`useHlsPlayer` 依赖收敛 —— 独立优化项。
- `SourceSubscription` 缺失 `enabled/group` 类型修复 —— 真 bug 但属类型治理，单独处理。
- 全局 toast 系统、通用 Modal 抽象 —— 留批次 3。

## Acceptance Criteria

- [ ] AC1：存在 `app/global-error.tsx` 与 `app/error.tsx`；构造一个子组件抛错，页面展示错误边界 UI 而非白屏，且有"重试"入口。
- [ ] AC2：`DanmakuCanvas` 主循环 `useEffect` 依赖数组不含 `currentTime`；播放期间该 effect 不再因 `currentTime` 变化而 cleanup+重建；`isPlaying=false` 时不持续 rAF。
- [ ] AC3：`useFavorites` 不再无条件订阅两个 store；`FavoriteButton` 只订阅自身 `isFavorite` 切片，无关卡片的收藏变动不再触发其 re-render。
- [ ] AC4：搜索返回多页结果时，列表底部出现"加载更多"且能成功加载下一页；`hasMore=false` 时隐藏触发器。
- [ ] AC5：搜索失败（断网/全源失败）时显示"搜索失败 + 重试"，而非"未找到结果"；重试可重新发起搜索。
- [ ] AC6：`npx tsc --noEmit` 通过；`npm test` 全绿（含新增断言）。
- [ ] AC7：手动回归——弹幕播放/暂停、收藏切换、搜索翻页、断网搜索失败均表现正常。

## Validation Status

- AC1 ✅ 新增 `app/error.tsx` + `app/global-error.tsx`。
- AC2 ✅ `DanmakuCanvas` 主循环依赖移除 `currentTime`（改 ref），暂停态停止 rAF。
- AC3 ✅ `favorites-store` 改 `createStore` + bound hook 消除双订阅；`FavoriteButton` 用 `useStore(api, selector)` 只订阅自身切片。history/search-history 留 follow-up。
- AC4 ✅ `page.tsx` 透传 `loadMore/hasMore/loadingMore`；`SearchResults` 渲染"加载更多"。
- AC5 ✅ `useSearchState` 加 `error`；`useSearchAction` 写入；`page.tsx` 区分 error（重试）vs no-results。
- AC6 ✅ `npx tsc --noEmit` 通过；`npm test` 67 例全绿。
- AC7 ❌ 待手动回归（弹幕 / 收藏 / 搜索翻页 / 断网搜索）。

## Risks

- **R2**：弹幕 seek/清空逻辑依赖另一个 `[currentTime]` effect（line 84），勿误改；主循环依赖收敛后需确保 `spawnComments` 仍能读到最新 `currentTime`（通过 ref）。
- **R3**：store helper 重构可能波及多个调用方（`FavoriteButton`/`FavoritesSidebar`/`usePersonalizedRecommendations` 等）；优先局部 selector 修复，避免大范围 API 变更。
- **R4**：`loadMore` 与主搜索共用 abortController（审查提示），透传时需确认不会互相打断。
