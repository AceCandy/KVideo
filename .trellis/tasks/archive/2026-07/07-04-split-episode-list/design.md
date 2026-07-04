# Design: EpisodeList 拆分技术设计

## 拆分边界

| 区 | 子组件 | 持有的 ref | 持有的 state | 持有的 effect | 接收的 props |
|---|---|---|---|---|---|
| 源选择器 | `<SourcePanel>` | `sourceItemRefs` | `sourceExpanded` / `showAllSources` / `latencies` / `isLoadingLatency` | Effect(scrollIntoView) / Effect(auto-refresh) | sources / currentSource / onSourceChange / currentResolution / sourceResolutions / sourceSectionCollapsed / onSourceSectionCollapseChange |
| 单源行 | `<SourceRow>` | — | — | — | source / isCurrent / latency / badge / globalIndex / onSelect / registerRef |
| 选集列表 | `<EpisodeSection>` | `listRef` / `buttonRefs` | — | — | episodes / currentEpisode / isReversed / onEpisodeClick / onToggleReverse / episodeSectionCollapsed / onEpisodeSectionCollapseChange |
| 壳 | `<EpisodeList>` | — | — | — | 原 10 个 props（全透传） |

## 文件落点

新建 `components/player/episode-list/` 子目录：

- `types.ts` — Episode / SourceInfo / EpisodeListProps / SourceRowProps
- `SourceRow.tsx` — 单源行原子（消除 grouped/ungrouped 重复）
- `SourcePanel.tsx` — 源选择器区（含全部源区 state/ref/effect/派生）
- `EpisodeSection.tsx` — 选集列表区（含键盘导航 / reverse 映射 / 两个 ref）

壳 `components/player/EpisodeList.tsx` 仅保留 Card 包裹 + props 路由 + `SourceInfo` re-export。

## 命名冲突处理

既有 `components/player/SourceSelector.tsx` 是无引用死代码（research 已全仓 grep 确认），内部 `SourceInfo` 为陈旧重复定义（缺 `typeName` / `remarks`）。

本任务**不删除**该死代码（遵循 surgical changes 原则，不借机清理无关代码），新源区子组件命名为 `SourcePanel` 以避开同名冲突。该死代码在交付报告中 mention，供用户决定是否单独清理。

## 类型契约

- `types.ts` 定义 `Episode` / `SourceInfo` / `EpisodeListProps` / `SourceRowProps`
- 壳 `EpisodeList.tsx` 通过 `export type { SourceInfo } from './episode-list/types'` 保持外部 `import { SourceInfo } from '@/components/player/EpisodeList'` 路径有效
- `SourceRow` 的 `badge` prop 类型由 `getSourceResolutionBadge` 返回值推断（`ReturnType`），不引入新类型名
- `registerRef` 签名：`(key: string, el: HTMLButtonElement | null) => void`

## ref / state / effect 归属（关键不变性）

三个 ref 全部随所在区整体下沉，**无需 forwardRef / useImperativeHandle / ref 提升**：

- `listRef` → `EpisodeSection`：仅 `useKeyboardNavigation` 读
- `buttonRefs` → `EpisodeSection`：仅 `useKeyboardNavigation` 的 `onNavigate` 读；按 `displayIndex` 索引，React `key` 用 `originalIndex`（稳定 key，不参与 ref 数组）
- `sourceItemRefs` → `SourcePanel`：仅 scrollIntoView effect 读；key 为 `source.source` 字符串

两个 effect 全部在源区内闭环：

- scrollIntoView effect deps `[currentSource, isSourceListOpen, showAllVisibleSources, sortedSources]` — 全部源区派生量
- auto-refresh effect deps `[sources, getSourcePingUrl]` — `getSourcePingUrl` 是源区内 `useCallback`（仅读全局 `settingsStore`）

## SourceRow 重复消除

grouped 与 ungrouped 两段渲染（约 75 行重复）统一为 `<SourceRow>`：

- grouped 分支：`globalIndex = sortedSources.indexOf(source)`
- ungrouped 分支：原用 `.map((source, index) => ...)` 的 `index`
- 两者数值等价（`visibleSources` 是 `sortedSources` 的保序子集，slice 不改变相对顺序）
- 统一为 `globalIndex`，奖牌颜色映射 `0=黄 / 1=灰 / 2=橙` 不变

**禁止**：提取时把 ungrouped 误改为 `visibleSources.indexOf`（slice 会导致 index 偏移，奖牌错位）。

`<SourcePanel>` 在两个 `.map()` 内部都渲染 `<SourceRow>`，传入相同 `globalIndex`。ref 回调通过 `registerRef` 透传，`sourceItemRefs` 仍归 `<SourcePanel>` 持有。

## 不变性清单（14 条，拆分后必须保持）

### 高优先级（行为正确性）

1. 键盘 ↑↓ 导航在 reverse 切换后仍命中正确集：`getDisplayIndex(currentEpisode)` → `buttonRefs[displayIndex]` → `onSelect` 用 `getOriginalIndex` 还原。三个映射函数随 `EpisodeSection` 整体下沉。
2. 切源后 scrollIntoView 仍把当前源滚到视口中心（`block: 'center'`）。
3. auto-refresh missing latencies 仍触发（Effect deps 完整）。
4. 折叠态行为：
   - `sourceSectionCollapsed=true`：箭头旋转 -90°；展开列表不渲染；刷新延迟按钮隐藏；`sourceExpanded` 切换按钮 cursor-default。
   - `episodeSectionCollapsed=true`：选集列表替换为「当前选集」摘要卡片；键盘导航 `enabled=false`；reverse toggle 隐藏。
5. 奖牌 Badge 排序颜色在 grouped 与 ungrouped 下一致（统一 `globalIndex`）。

### 中优先级（视觉一致性）

6. 源行点击后 `setSourceExpanded(false)`（点击非当前源后收起列表）。
7. `sourceExpanded` 切换按钮 cursor 语义：`sourceSectionCollapsed ? 'cursor-default' : 'cursor-pointer'`；collapsed 时不切换 expanded。
8. `forceExpandedForCurrentSource` 自动展开（currentSource 位置 ≥ MAX_VISIBLE=5 时）。
9. 奖牌 Badge 仅对非当前源显示（`!isCurrent && globalIndex < 3`）。
10. 当前源指示 `<Icons.Play />`。

### 低优先级（实现细节）

11. `sourceItemRefs` key 为 `source.source` 字符串（非 source.id）。
12. `buttonRefs` 按 displayIndex 索引，React `key` 用 originalIndex。
13. `MAX_VISIBLE = 5` 常量与「展开更多 / 收起」文案不变。
14. 最外层 `<Card hover={false}>` 包裹留壳。

## 风险与缓解

| 风险 | 缓解 |
|---|---|
| reverse 键盘映射错位 | `EpisodeSection` 整体下沉三个映射函数，零跨边界；tsc 验证类型；交付报告标注渲染层需人工验证 |
| SourceRow 提取时奖牌 index 偏移 | 统一用 `sortedSources.indexOf(source)`，禁止 `visibleSources.indexOf` |
| sourceItemRefs 跨边界 | ref 随 `SourcePanel` 持有，`registerRef` 透传到 `SourceRow` |
| 死代码 SourceSelector 误导 | 新组件命名 `SourcePanel` 避开，报告 mention |
