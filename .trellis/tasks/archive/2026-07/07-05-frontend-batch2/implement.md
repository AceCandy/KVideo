# Implement — 前端批次2

按"低风险 → 高风险"推进，每步可独立验证。

## 1. R1 — Error Boundary（独立、新增文件）

- [ ] 新增 `app/error.tsx`（`'use client'`，class 或 useState，展示错误 + `reset()` 重试，glass card 居中）。
- [ ] 新增 `app/global-error.tsx`（自带 `<html><body>`，处理 root layout 抛错，含重试）。
- [ ] 验证：`npx tsc --noEmit`；临时在 `app/page.tsx` 某子组件抛错确认显示边界 UI 而非白屏，验证后移除测试代码。

## 2. R2 — DanmakuCanvas rAF 收敛（单文件，需谨慎）

- [ ] 读 `DanmakuCanvas.tsx` 全貌，确认主循环 effect（line 271）与 seek effect（line 84）的职责边界。
- [ ] 新增 `currentTimeRef`，在既有 `[currentTime]` effect（line 84）或新增小 effect 同步。
- [ ] 主循环 effect 依赖改为 `[isPlaying, opacity, fontSize, spawnComments]`；`animate`/`spawnComments` 读 ref。
- [ ] 暂停态停止 rAF 空转。
- [ ] 验证：`npx tsc --noEmit`；播放视频开弹幕，观察弹幕正常滚动、seek 后弹幕清空重建正常、暂停不持续耗电。

## 3. R3 — store 双订阅消除（波及面最大，先读后改）

- [ ] 读 `createFavoritesStore` 返回类型 + `FavoriteButton` 现有用法 + `useFavorites`/`useHistory`/`useSearchHistory` 所有调用方。
- [ ] `FavoriteButton` 改用 Zustand selector 订阅 `isFavorite(videoId)` 布尔切片 + `addFavorite/removeFavorite` action（action 引用稳定，不会触发 re-render）。
- [ ] helper `useFavorites`/`useHistory`/`useSearchHistory` 改用 `useStore(isPremium ? premiumApi : normalApi, selector)` 动态选 store（若 api 可得）；若波及过多调用方，回退为仅 FavoriteButton 局部修复，并在 prd 标注 helper 重构留后续。
- [ ] 验证：`npx tsc --noEmit`；`npm test`；收藏切换观察只有目标卡片重渲染。

## 4. R4 — 搜索 loadMore 接通

- [ ] 读 `app/page.tsx:63-82` + `SearchResults.tsx` + `VideoGrid` 现有无限滚动逻辑。
- [ ] `page.tsx` 透传 `loadMore/hasMore/loadingMore` 给 `SearchResults`。
- [ ] `SearchResults`/`VideoGrid` 渲染"加载更多"触发器（`hasMore` 时显示）。
- [ ] 验证：`npx tsc --noEmit`；搜索多页结果，底部出现加载更多且能加载下一页；`hasMore=false` 时隐藏。

## 5. R5 — 搜索 error 态

- [ ] 读 `useSearchState.ts` + `useSearchAction.ts:131-145` + `page.tsx:80-82` + `NoResults.tsx`。
- [ ] `useSearchState` 增 `error: string | null` + `setError`。
- [ ] `useSearchAction` 的 `onError`/`catch` 写 `setError`（AbortError 不计）；成功清 error。
- [ ] `page.tsx` 渲染分支：error 非空 → 失败 UI + 重试；否则 zero-results → NoResults。
- [ ] 验证：`npx tsc --noEmit`；断网搜索显示失败 + 重试；正常搜索无回归。

## 6. 质量闸与回归

- [ ] `npx tsc --noEmit` 通过。
- [ ] `npm test` 全绿。
- [ ] 手动回归（AC7）：弹幕、收藏、搜索翻页、断网搜索失败。

## Review Gate

对照 AC1–AC7 逐条勾选；AC6 必过；AC7 至少覆盖弹幕 + 搜索两条主路径。完成后进入 update-spec / commit / archive。
