# Implement: EpisodeList 拆分执行计划

## 执行顺序

1. 创建 `episode-list/types.ts`：迁移 `Episode` / `SourceInfo` / `EpisodeListProps`，新增 `SourceRowProps`（badge 类型用 `getSourceResolutionBadge` 返回值推断）
2. 创建 `episode-list/SourceRow.tsx`：单源行原子，props 含 `registerRef`（用于回写 `sourceItemRefs`）+ `onSelect`（封装点击 + `setSourceExpanded(false)` 由父级传入）
3. 创建 `episode-list/SourcePanel.tsx`：源选择器区整体下沉，持有 `sourceItemRefs` + 四个 state + 两个 effect + 全部源区派生 + `getSourcePingUrl` + `refreshLatencies`；在 grouped / ungrouped 两分支渲染 `<SourceRow>`，统一传 `globalIndex`
4. 创建 `episode-list/EpisodeSection.tsx`：选集列表区整体下沉，持有 `listRef` + `buttonRefs` + `displayEpisodes` + `getOriginalIndex` + `getDisplayIndex` + `useKeyboardNavigation` + 标题栏（reverse toggle / collapse 按钮）+ 折叠态摘要卡片
5. 重写壳 `EpisodeList.tsx`：仅保留 `Card` 包裹 + props 解构 + 路由到 `<SourcePanel>` / `<EpisodeSection>` + `export type { SourceInfo } from './episode-list/types'`
6. 验证：`npx tsc --noEmit`
7. 验证：`npx next build`

## 验证命令

- `npx tsc --noEmit`（类型 + ref 类型完整性）
- `npx next build`（edge 编译完整性）

## 回滚点

每步保持工作树可编译。任一步骤 tsc 失败即定位并修复，不堆积错误。整个工作在 feature 分支 `refactor/split-episode-list` 上进行，必要时可整分支丢弃重来。

## 渲染层人工验证（交付后）

本地无 dev/docker，以下场景需用户下次起服务时验证：

- 多源场景：切源后 scrollIntoView 把当前源滚到中心
- reverse 场景：倒序后键盘 ↑↓ 命中正确集
- 折叠场景：两个 collapse props 分别折叠源区 / 选集区行为正常
- 分组场景：typeName 分组渲染 + 奖牌颜色一致

## 不做

- 不删除旧 `SourceSelector.tsx`（死代码，surgical changes）
- 不引入 `React.memo`
- 不改动 `useKeyboardNavigation` hook
- 不调整 latency / resolution probe 算法
