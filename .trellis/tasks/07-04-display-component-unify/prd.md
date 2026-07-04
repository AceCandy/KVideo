# 展示组件统一（Grid/Card 抽象）

## 背景

5 个 Grid + 6 个 Card/Item 共 ~1540 行，多处重复（Explore 调研）：
- Grid 容器布局 class 4/5 共享骨架
- `visibleCount + IntersectionObserver` 在 VideoGrid/FavoritesGrid 手写，而项目已有 useInfiniteScroll
- empty/loading/noMore 状态子组件在 MovieGrid/PremiumContentGrid **逐字重复**
- Card `poster+overlay+info` 三段式 + z-index hover hack 在 4 处重复
- FavoritesItem/HistoryItem 横向 item 孪生

## 目标

抽共享层，各业务复用，预估净削 ~480 行（~31%），行为/视觉零回归。

## 约束

- 行为/视觉零回归（逐屏对比）。
- 数据类型 / Card 内容 / 特有交互保持各自。
- IPTVChannelGrid 不纳入（领域模型与布局差异最大）。
- 不引入新依赖。

## 验收（整体）

- 改动组件视觉与交互逐项与现状一致。
- tsc + test 全绿。
- 净行数下降（目标 ~400+ 行）。

## 拆分（独立切片）

- **C1a GridState + CardGrid**：抽布局包装 + 状态子组件，MovieGrid/PremiumContentGrid 复用。最低风险。
- C1b useInfiniteSlice：统一 VideoGrid/FavoritesGrid 手写 observer。
- C1c PosterCard：抽 VideoCard/VideoGroupCard/MovieCard/premium 海报骨架 + z-index hack。
- C1d ListItemRow：抽 FavoritesItem/HistoryItem 横向骨架。

**本次执行 C1a。** C1b/C1c/C1d 在 implement.md 列出，留后续。
