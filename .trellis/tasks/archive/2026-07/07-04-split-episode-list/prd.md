# PRD: Split EpisodeList into shell + subcomponents

## 背景

`components/player/EpisodeList.tsx`（657 行）是 god component，混合三块自治功能：

- 源选择器区：latency 探测 / resolution badge / typeName 分组渲染 / 折叠态 / auto-refresh
- 选集标题栏：reverse 切换 / 折叠按钮
- 选集列表区：键盘导航 / reverse 双向映射 / displayIndex↔originalIndex ref 索引

ref、state、effect、键盘导航耦合度高，可读性差。

## 目标

按功能分区将 god component 拆为壳 + 子组件，每个子组件自包含所在区的全部状态/ref/effect。对外 props 表面零变化。

## 范围

- 纯结构重构，不改变任何运行时行为
- 不改动 `<EpisodeList>` 的 props 表面（10 个 props 全部沿用）
- 不改动 `SourceInfo` 导出路径（`from '@/components/player/EpisodeList'`）
- 不改动调用方 `app/player/page.tsx`
- 不删除既有死代码 `components/player/SourceSelector.tsx`

## 非目标

- 不引入 React.memo / useMemo 调整等性能优化
- 不重构 `useKeyboardNavigation` hook 本身
- 不调整 latency 探测 / resolution probe 的算法
- 不清理死代码 `SourceSelector.tsx`（仅 mention）

## 验收标准

1. `npx tsc --noEmit` 零错误
2. `npx next build` 成功（edge 编译完整）
3. 调用方 `app/player/page.tsx` 零改动
4. design.md 中的 14 条行为不变性全部保持
5. 壳 `EpisodeList.tsx` 行数显著下降（目标 ≤ 120 行）
6. `SourceInfo` 导出路径不变
