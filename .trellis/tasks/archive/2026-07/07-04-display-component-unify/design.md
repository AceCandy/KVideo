# 设计：展示组件统一

## 抽象边界（Explore 调研结论）

5 个共享抽象，按重复度排序：
1. **GridState**（empty/loading/noMore）——MovieGrid/PremiumContentGrid 逐字重复，最高优先。
2. **CardGrid**（grid 布局包装）——4/5 grid 共享骨架。
3. **useInfiniteSlice**——VideoGrid/FavoritesGrid 手写 observer。
4. **PosterCard**——VideoCard/VideoGroupCard/MovieCard/premium 海报三段式 + z-index hack。
5. **ListItemRow**——FavoritesItem/HistoryItem 横向孪生。

## 本次范围（C1a）

GridState + CardGrid → MovieGrid / PremiumContentGrid 复用：
- 删 6 个逐字重复的状态子组件（MovieGridEmpty/Loading/NoMore + PremiumGridEmpty/Loading/NoMore）。
- 两 grid 容器统一为 `<CardGrid>`。
- 状态统一为 `<GridState.*>`。

## GridState 设计

`components/ui/GridState.tsx` 导出 `GridLoading` / `GridNoMore` / `GridEmpty`。`GridEmpty` 接受 `icon`（默认 Icons.Film）与 `text`（默认"暂无内容"）props，其余视觉 class 逐字迁移自现状。

## CardGrid 设计

`components/ui/CardGrid.tsx`：default variant = `grid-cols-2 sm:3 md:4 lg:5 gap-4 md:gap-6`（MovieGrid/PremiumContentGrid 现状）。`children` 为卡片列表。不含数据获取、不含 observer（保持与外部 ref 模式解耦）。

## 不在本次

- C1b useInfiniteSlice / C1c PosterCard / C1d ListItemRow（见 implement.md）。
- IPTVChannelGrid（领域差异，不纳入）。

## 风险

低：GridState/CardGrid 是纯展示抽象，视觉 class 逐字迁移；MovieGrid/PremiumContentGrid 行为不变（外部 ref 模式、onVideoClick 等保留）。
