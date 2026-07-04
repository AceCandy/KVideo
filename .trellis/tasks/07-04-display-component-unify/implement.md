# 执行计划：展示组件统一

## 本次：C1a GridState + CardGrid

- [ ] 1. 建 `components/ui/GridState.tsx`（GridLoading / GridNoMore / GridEmpty，icon/text 参数化）。验证 tsc。
- [ ] 2. 建 `components/ui/CardGrid.tsx`（grid 布局包装，default = lg:5 gap-4 md:6）。验证 tsc。
- [ ] 3. MovieGrid 复用 CardGrid + GridState，删 3 个本地状态子组件。验证 tsc + dev 首页视觉。
- [ ] 4. PremiumContentGrid 复用 CardGrid + GridState，删 3 个本地状态子组件。验证 tsc + dev premium 视觉。
- [ ] 5. build 通过 + commit。

## 后续切片（本次不做，留后续 session）

- C1b useInfiniteSlice：VideoGrid/FavoritesGrid observer 统一。
- C1c PosterCard：VideoCard/VideoGroupCard/MovieCard/premium 海报骨架 + z-index hack（最大单点收益）。
- C1d ListItemRow：FavoritesItem/HistoryItem 横向骨架。

## 验证命令

- 类型：npx tsc --noEmit
- 单测：npm test
- 构建：npm run build
- 行为：npm run dev + 首页 / premium 视觉对比

## 回滚

单一 commit；失败 git revert。
