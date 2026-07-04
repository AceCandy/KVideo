# Research: EpisodeList 拆分前边界与不变性分析

- **Query**: 为 C5b 战役（拆分 `components/player/EpisodeList.tsx`，657 行 god component）提供拆分前的边界与不变性分析
- **Scope**: internal
- **Date**: 2026-07-04

## 关键前置发现（影响拆分策略）

### 发现 1：仓库已存在一个未被使用的 `components/player/SourceSelector.tsx`

通过 `grep -rn "SourceSelector"` 全仓搜索确认：**该文件没有任何 import 使用方**。EpisodeList.tsx 内部出现的 `showSourceSelector` 仅是一个局部布尔变量，与此组件无关。

该文件是一个**旧版本/废弃实现**，与当前 EpisodeList 内联的源选择器区差异巨大：

| 维度 | 旧 `SourceSelector.tsx` | EpisodeList 内联源区 |
|---|---|---|
| collapsed / expanded 折叠态 | ❌ 无 | ✅ 有（`sourceSectionCollapsed` / `sourceExpanded`） |
| grouped by typeName 分组渲染 | ❌ 无 | ✅ 有（376-452） |
| Resolution Badge（`getResBadge`） | ❌ 无 | ✅ 有 |
| 奖牌 Badge #1/#2/#3 | ✅ 有（基于 sorted index） | ✅ 有（grouped 用 `globalIndex`，ungrouped 用 `index`） |
| Auto-refresh missing latencies | ❌ 无 | ✅ 有（Effect 2） |
| SourceInfo 字段 | `id/source/sourceName/latency/pic` | 多 `typeName/remarks` 字段 |
| `getSourcePingUrl`（settingsStore 解析） | ❌ 无（直接 ping `source.source`） | ✅ 有 |

**对 C5b 战略的直接影响**：

- 「新建 `<SourceSelector>` 子组件」会与现有同名文件**命名冲突**。
- 推荐处理：**删除旧 `SourceSelector.tsx`（死代码）后**再创建新的子组件；或将新子组件命名为 `SourceSelectorSection` / `SourceListPanel` 以避免歧义。该决策应由主 agent 在 implement 阶段裁定。
- 旧文件内的 `SourceInfo` 接口也是陈旧定义（缺字段），属于重复定义，应一并清理。

### 发现 2：对外契约必须零变化

`<EpisodeList>` 的**唯一调用方**是 `app/player/page.tsx`（第 518 行）。

`SourceInfo` 类型被 `app/player/page.tsx` 第 9 行显式 `import`，并用于多处 state（`discoveredSources` line 100、`groupedSourcesRef` line 101、`groupedSources` useMemo line 145 等）。

→ **结论**：拆分必须保持 `EpisodeListProps` 表面零变化、`SourceInfo` 导出位置零变化（或在主 agent 同意下迁移并更新 import）。

---

## 1. 完整结构映射（按区域，概念性归属）

| 区域 | 内容 | 拆分归属 |
|---|---|---|
| **类型定义** | `interface Episode`、`export interface SourceInfo`、`interface EpisodeListProps` | 留在壳（或抽到 `types.ts`，但 SourceInfo 必须 re-export 保持 import 路径不变） |
| **壳层 state（路由用）** | 仅需 `showSourceSelector`（派生布尔）、`showReverseToggle`、`currentEpisodeLabel` | 壳 |
| **源区 refs** | `sourceItemRefs`（HTMLButtonElement Record） | 下沉到 `<SourceSelector>` |
| **源区 state** | `sourceExpanded` / `showAllSources` / `latencies` / `isLoadingLatency` | 全部下沉到 `<SourceSelector>` |
| **源区派生** | `getResBadge` / `currentSourceInfo` / `initialLatencies` / `mergedLatencies` / `sortedSources` / `isSourceListOpen` / `forceExpandedForCurrentSource` / `showAllVisibleSources` / `getSourcePingUrl` / `refreshLatencies` | 全部下沉到 `<SourceSelector>` |
| **Effect 1**（scrollIntoView currentSource） | 仅依赖源区派生量 | 下沉到 `<SourceSelector>` |
| **Effect 2**（auto-refresh missing latencies） | 仅依赖 `sources` + `getSourcePingUrl` | 下沉到 `<SourceSelector>` |
| **选集区 refs** | `listRef`（HTMLDivElement）、`buttonRefs`（HTMLButtonElement 数组） | 下沉到 `<EpisodeSection>` |
| **选集区派生** | `displayEpisodes` / `getOriginalIndex` / `getDisplayIndex` | 下沉到 `<EpisodeSection>` |
| **键盘导航 hook** | `useKeyboardNavigation({...})` 调用块 | 下沉到 `<EpisodeSection>` |
| **JSX 源选择器区** | `{showSourceSelector && (...)}` 整块 | 下沉到 `<SourceSelector>` |
| **JSX 选集标题栏** | `<div className="text-lg... 选集">` 含 reverse toggle、collapse 按钮 | 下沉到 `<EpisodeSection>`（与列表联动） |
| **JSX 选集列表区** | `episodeSectionCollapsed ? <折叠态> : <listRef 容器>` 整块 | 下沉到 `<EpisodeSection>` |
| **JSX 壳层包裹** | 最外层 `<Card hover={false}>...</Card>` | 壳（保留） |

---

## 2. ref 生命周期与跨边界风险

### `listRef`（HTMLDivElement）

- **写**：选集列表容器 `<div ref={listRef}>`（折叠态分支不挂载，ref 为 null）。
- **读**：仅 `useKeyboardNavigation`（`containerRef: listRef`）注册 keydown 监听。
- **跨边界传递**：完全自包含于选集区。**可整体下沉到 `<EpisodeSection>`**，无需父级介入。

### `buttonRefs`（HTMLButtonElement 数组，按 displayIndex 索引）

- **写**：选集 button 的 `ref={(el) => { buttonRefs.current[displayIndex] = el; }}`。
- **读**：`useKeyboardNavigation` 的 `onNavigate`（`buttonRefs.current[index]?.focus()` + `scrollIntoView`）。
- **displayIndex ↔ originalIndex 映射**：key 用 `originalIndex`（稳定 key），但 ref 数组按 `displayIndex` 存（用于键盘导航按显示顺序聚焦）。
- **跨边界传递**：完全自包含于选集区。**可整体下沉到 `<EpisodeSection>`**。
- **关键不变性**：ref 数组的索引含义是「显示位置」，与 `getDisplayIndex(currentEpisode)` 输出的语义一致；拆分后必须保持这层「数组下标 == displayIndex」的约定。

### `sourceItemRefs`（HTMLButtonElement Record，key = source.source 字符串）

- **写**：源 button 的 `ref={(element) => { sourceItemRefs.current[source.source] = element; }}`（grouped 与 ungrouped 两分支都写同一 Record）。
- **读**：Effect 1 `sourceItemRefs.current[currentSource]?.scrollIntoView({ block: 'center' })`。
- **跨边界传递**：仅源区 Effect 1 读写，**完全自包含于源区**。**可整体下沉到 `<SourceSelector>`**。

### 结论：B 策略下三个 ref **全部可下沉，零跨边界传递**

| ref | 下沉目标 | 跨边界? |
|---|---|---|
| `listRef` | `<EpisodeSection>` | 否 |
| `buttonRefs` | `<EpisodeSection>` | 否 |
| `sourceItemRefs` | `<SourceSelector>` | 否 |

**无需任何 ref 提升到父级、无需 forwardRef、无需 useImperativeHandle**。这是 B 策略（分区整体下沉）可行的核心证据。

---

## 3. Effect 依赖链

### Effect 1（scrollIntoView currentSource）

- **deps**：`[currentSource, isSourceListOpen, showAllVisibleSources, sortedSources]`
- **内部读写**：读 `sourceItemRefs`（ref，不入 deps）；调用 `scrollIntoView({ block: 'center' })`。
- **所有依赖来源**：
  - `currentSource`：来自 props（源区入参）
  - `isSourceListOpen` / `showAllVisibleSources` / `sortedSources`：源区派生量
- **下沉结论**：所有依赖均在源区内闭环。下沉到 `<SourceSelector>` 零跨边界。

### Effect 2（auto-refresh latencies for missing）

- **deps**：`[sources, getSourcePingUrl]`
- **内部读写**：读 `sources`、`getSourcePingUrl`；写 `setLatencies`。
- **所有依赖来源**：`sources` 来自 props；`getSourcePingUrl` 是源区 `useCallback`（仅依赖 `settingsStore.getSettings()`，外部 store）。
- **下沉结论**：所有依赖均在源区内闭环。下沉到 `<SourceSelector>` 零跨边界。

**两个 effect 下沉后均无需任何跨边界依赖。**

---

## 4. 键盘导航不变性

### `useKeyboardNavigation` 调用块依赖分析

| 参数 | 来源 | 在选集区内? |
|---|---|---|
| `enabled` | `!episodeSectionCollapsed`（props 派生） | ✅（props 直接传入 EpisodeSection） |
| `containerRef` | `listRef`（区内 ref） | ✅ |
| `currentIndex` | `getDisplayIndex(currentEpisode)`（区内派生 + props） | ✅ |
| `itemCount` | `episodes?.length \|\| 0`（props） | ✅ |
| `orientation` | `'vertical'`（常量） | ✅ |
| `onNavigate` | 闭包：`buttonRefs.current[index]?.focus()` + scrollIntoView | ✅（区内 ref） |
| `onSelect` | 闭包：`getOriginalIndex(displayIndex)` → `onEpisodeClick(episodes[origIdx], origIdx)` | ✅（区内派生 + props callback） |

### reverse=true 时的双向映射

- `displayEpisodes = isReversed ? [...episodes].reverse() : episodes`
- `getOriginalIndex(displayIdx) = isReversed ? length - 1 - displayIdx : displayIdx`
- `getDisplayIndex(origIdx) = isReversed ? length - 1 - origIdx : origIdx`
- 两者互为逆函数：`getOriginalIndex(getDisplayIndex(x)) === x` 恒成立。
- 键盘 ↑/↓ 在 displayIndex 空间移动（`useKeyboardNavigation` 内部 `currentIndex + 1 / - 1`），通过 `getDisplayIndex(currentEpisode)` 把 originalEpisode 投影到 displayIndex；`onNavigate` 直接用 displayIndex 索引 `buttonRefs.current[displayIndex]`，与 ref 数组写入侧（按 displayIndex 存）语义一致。
- `onSelect(displayIndex)` 先 `getOriginalIndex` 还原到 originalIndex，再调 `onEpisodeClick(episode, originalIndex)`，与点击行为一致（点击时 `onClick={() => onEpisodeClick(episode, originalIndex)}`，episode 来自 `displayEpisodes[displayIndex]`，originalIndex 来自 `getOriginalIndex(displayIndex)`）。

### 子组件化等价性结论

`<EpisodeSection>` 自包含 `listRef` + `buttonRefs` + `displayEpisodes` + `getOriginalIndex` + `getDisplayIndex` + `useKeyboardNavigation` + `onEpisodeClick`（props） + `currentEpisode`（props） + `isReversed`（props） + `episodes`（props） + `episodeSectionCollapsed`（props）。

**行为完全等价**，前提是上述 props 全部透传给 `<EpisodeSection>`。

---

## 5. 源区逻辑内聚性

逐项核对（仅检查是否对**源区外部**的 state/ref 有依赖）：

| 源区逻辑 | 是否自包含 | 备注 |
|---|---|---|
| `getSourcePingUrl` | ✅ | 仅读 `settingsStore.getSettings()`（全局 store，非组件 state） |
| `getResBadge` | ✅ | deps: `[currentResolution, sourceResolutions]`（均为 props 入参） |
| `currentSourceInfo` | ✅ | deps: `[sources, currentSource]`（props） |
| `initialLatencies` | ✅ | deps: `[sources]` |
| `mergedLatencies` | ✅ | deps: `[initialLatencies, latencies]`（区内 state） |
| `sortedSources` | ✅ | deps: `[mergedLatencies, sources]` |
| `isSourceListOpen` | ✅ | 派生：`!sourceSectionCollapsed && sourceExpanded` |
| `forceExpandedForCurrentSource` | ✅ | deps: `sortedSources` + `currentSource` |
| `showAllVisibleSources` | ✅ | 派生：`showAllSources \|\| forceExpandedForCurrentSource` |
| `refreshLatencies` | ✅ | deps: `[sources, getSourcePingUrl]` |
| state `sourceExpanded` / `showAllSources` | ✅ | 区内 |
| state `latencies` / `isLoadingLatency` | ✅ | 区内 |
| Effect 1 / Effect 2 | ✅ | 见 §3 |

**结论**：源区逻辑**完全自包含**，唯一对外依赖是 props 入参：

- `sources`
- `currentSource`
- `onSourceChange`
- `currentResolution`
- `sourceResolutions`
- `sourceSectionCollapsed`
- `onSourceSectionCollapseChange`

`<SourceSelector>` 接收这 7 个 props 即可自包含运行。无任何外部 state/ref 依赖。

---

## 6. SourceRow 重复消除

### grouped（376-452）与 ungrouped（456-531）逐段对比

**完全相同的部分**（可提取为 `<SourceRow>`）：

| 元素 | 共有代码 |
|---|---|
| button 容器 | `className` 模板（current/highlight 样式）、`aria-current`、`onClick` 闭包（`if (!isCurrent) { onSourceChange!(source); setSourceExpanded(false); }`） |
| ref 回调 | `ref={(element) => { sourceItemRefs.current[source.source] = element; }}` |
| 缩略图 | `{source.pic && (<div>...<Image/></div>)}` 整块 |
| 主信息 | `{source.sourceName \|\| source.source}` + `badge` 渲染 + `remarks` 渲染 + `LatencyBadge` 渲染 |
| 当前播放指示 | `{isCurrent && <Icons.Play />}` |

**差异点**（仅奖牌 Badge）：

| 分支 | 排序键 | Badge 渲染条件 | 颜色判定键 |
|---|---|---|---|
| grouped | `const globalIndex = sortedSources.indexOf(source);` | `!isCurrent && globalIndex < 3` | `globalIndex === 0 / 1 / 2` → 黄/灰/橙 |
| ungrouped | `visibleSources.map((source, index) => ...)` 的 `index` | `!isCurrent && index < 3` | `index === 0 / 1 / 2` → 黄/灰/橙 |

**关键差异分析**：

- 在 ungrouped 分支中，`visibleSources === sortedSources`（当 `!hasTypeGroups` 时 `groupedByType` 退化为单一分组，但代码路径走 ungrouped 分支，此时 `visibleSources` 仍是按 latency 排序的子集）。所以 ungrouped 的 `index` 与 grouped 的 `globalIndex` **在数值上几乎等价**——两者都指向 `sortedSources` 内的位置。
- 唯一边界场景：当 `showAllVisibleSources === false` 时 `visibleSources = sortedSources.slice(0, MAX_VISIBLE)`，此时 ungrouped 的 `index` 仍是 `sortedSources` 内的位置（因为 slice 保留原顺序）。**结论：两者数值等价，可统一为 `globalIndex`（即 `sortedSources.indexOf(source)`）**。

### `<SourceRow>` props 契约草案

```ts
interface SourceRowProps {
  source: SourceInfo;
  isCurrent: boolean;
  latency: number | undefined;
  badge: ResolutionBadge | null;       // 由父级 getResBadge 预计算后传入
  globalIndex: number;                  // 在 sortedSources 中的位置，用于奖牌
  onSelect: (source: SourceInfo) => void;
  registerRef: (key: string, el: HTMLButtonElement | null) => void;
}
```

- 父级（`<SourceSelector>`）在 grouped / ungrouped 两个 `.map()` 内部都渲染 `<SourceRow .../>`，传入相同的 `globalIndex`（统一用 `sortedSources.indexOf(source)`）。
- ref 回调通过 `registerRef` 透传，`sourceItemRefs` 仍归 `<SourceSelector>` 持有（Effect 1 依赖）。

**预计消除约 75 行重复代码**（452-376=76 行 grouped vs 531-456=75 行 ungrouped，重复部分）。

---

## 7. 对外契约与调用方

### `<EpisodeList>` import / 使用点

| 文件 | 行为 |
|---|---|
| `app/player/page.tsx:7` | `import { EpisodeList } from '@/components/player/EpisodeList';` |
| `app/player/page.tsx:518` | `<EpisodeList ... />` 唯一渲染点 |

### `SourceInfo` 类型 import / 使用点

| 文件 | 行为 |
|---|---|
| `app/player/page.tsx:9` | `import { SourceInfo } from '@/components/player/EpisodeList';` |
| `app/player/page.tsx:100` | `useState<SourceInfo[]>` |
| `app/player/page.tsx:101` | `useRef<SourceInfo[]>` |
| `app/player/page.tsx:145-146` | `useMemo<SourceInfo[]>` |
| `app/player/page.tsx:201, 237` | `SourceInfo[]` 局部变量 |

**注**：`app/api/app-update/route.ts` 内的 `buildSourceInfo` / `SourceInfo` 是同名不同源（route.ts 内部局部函数/变量，与组件无关）。

`components/player/SourceSelector.tsx:16` 内的 `export interface SourceInfo` 是**陈旧重复定义**（缺 `typeName/remarks`），且该文件无任何 import 方。

### `Episode` 类型

仅 EpisodeList.tsx 内部使用，未导出。`onEpisodeClick` 的 `(episode: Episode, index: number)` 签名对调用方而言是结构化推断，调用方 `handleEpisodeClick` 不显式标注 Episode 类型（page.tsx 直接用 `videoData?.episodes` 传入），故 Episode 类型可保留在壳内不导出。

### 结论

- **`<EpisodeList>` 的 props 表面必须零变化**（10 个 props 全部沿用）。
- **`SourceInfo` 必须从壳继续 `export`**（保持 `import { SourceInfo } from '@/components/player/EpisodeList'` 路径有效）；若迁移到独立 `types.ts`，需保留 re-export shim。
- **`Episode` 类型无需对外导出**。
- **建议**：实施时一并删除死代码 `components/player/SourceSelector.tsx`（含其陈旧 `SourceInfo` 重复定义），避免与新建子组件命名冲突。

---

## 8. 不变性清单（拆分后必须保持）

按优先级排序，作为后续 check / 验证的依据：

### 高优先级（行为正确性）

1. **键盘 ↑↓ 导航在 reverse 切换后仍命中正确集**：`getDisplayIndex(currentEpisode)` 把当前集投影到 displayIndex；`onNavigate` 用 displayIndex 索引 `buttonRefs`；`onSelect` 用 `getOriginalIndex` 还原。三个映射函数必须随 `<EpisodeSection>` 整体下沉，且依赖项（`episodes`、`isReversed`、`currentEpisode`、`onEpisodeClick`）全部透传。

2. **切源后 scrollIntoView 仍把当前源滚到视口中心**：Effect 1 必须随 `<SourceSelector>` 整体下沉，`sourceItemRefs`、`sortedSources`、`isSourceListOpen`、`showAllVisibleSources`、`currentSource` 全部在子组件内闭环。`block: 'center'` 行为不变。

3. **auto-refresh missing latencies 仍触发**：Effect 2 必须随 `<SourceSelector>` 下沉，`sources` / `getSourcePingUrl` 依赖完整。`setLatencies` 写入区内地 state，不影响父级。

4. **折叠态 props 行为不变**：
   - `sourceSectionCollapsed=true`：源区折叠按钮箭头旋转 -90°；展开列表不渲染（`isSourceListOpen=false`）；刷新延迟按钮隐藏；sourceExpanded 切换按钮变 cursor-default。
   - `episodeSectionCollapsed=true`：选集列表替换为「当前选集」摘要卡片；键盘导航 `enabled=false`（`!episodeSectionCollapsed`）；reverse toggle 按钮隐藏。
   - 两个 collapse props 必须分别透传到对应子组件。

5. **奖牌 Badge（#1/#2/#3）排序颜色在 grouped 与 ungrouped 下一致**：统一用 `globalIndex = sortedSources.indexOf(source)`，颜色映射 `0=黄/1=灰/2=橙` 不变。**禁止**在 `<SourceRow>` 提取时把 ungrouped 分支错误地改为 `visibleSources.indexOf`（会因 slice 导致 index 偏移）。

### 中优先级（视觉一致性）

6. **源行点击后 `setSourceExpanded(false)`**：必须保留（点击非当前源后收起列表）。该闭包需透传到 `<SourceRow>` 的 `onSelect`。

7. **`sourceExpanded` 状态切换按钮的 cursor 语义**：`sourceSectionCollapsed ? 'cursor-default' : 'cursor-pointer'`，且 collapsed 时不切换 expanded（`if (!sourceSectionCollapsed) setSourceExpanded(...)`）。

8. **`forceExpandedForCurrentSource` 自动展开**：当 currentSource 在 `sortedSources` 中位置 ≥ MAX_VISIBLE(5) 时，`shouldExpandForCurrentSource` 返回 true，自动展开源列表。该派生量必须随源区下沉。

9. **奖牌 Badge 仅对非当前源显示**：`!isCurrent && globalIndex < 3` 条件不变。

10. **当前源指示 `<Icons.Play />`**：`isCurrent && <Icons.Play size={14} />` 不变。

### 低优先级（实现细节，但需保留）

11. **`sourceItemRefs` key 为 `source.source` 字符串**（非 source.id），与 Effect 1 的 `sourceItemRefs.current[currentSource]` 索引方式一致。拆分后 ref 由 `<SourceSelector>` 持有，`registerRef` 透传到 `<SourceRow>` 时仍用 `source.source` 作 key。

12. **`buttonRefs` 按 displayIndex 索引，但 key 用 originalIndex**：选集 button 的 React `key={originalIndex}`（稳定 key），`ref` 回调写 `buttonRefs.current[displayIndex]`（导航 key）。拆分后两者均归 `<EpisodeSection>`。

13. **`MAX_VISIBLE = 5` 常量**：「展开更多」按钮逻辑（`sortedSources.length > MAX_VISIBLE`）、「收起」/「展开更多 (N)」文案不变。

14. **`<Card hover={false}>` 最外层包裹**：保留在壳层，不随子组件下沉。

---

## Caveats / Not Found

### C1：旧 `SourceSelector.tsx` 的处置未在任务范围内裁定

本研究仅确认该文件为死代码（无 import 方）。是否在新子组件创建时一并删除，属于**主 agent 决策范畴**（涉及命名冲突、历史保留策略）。研究 agent 不做处置建议，仅标记风险。

### C2：`<SourceRow>` 提取是否引入 React.memo 优化

未在拆分范围内强制要求。若加 memo，需注意 `registerRef` 回调稳定性（建议父级 `useCallback`），否则 memo 失效。本研究不预设该决策。

### C3：未对拆分后子组件文件位置做硬性规定

候选位置：`components/player/SourceSelector.tsx`（冲突，需先清死代码）/ `components/player/EpisodeSection.tsx` / `components/player/SourceRow.tsx`，或新建 `components/player/episode-list/` 子目录。具体落点由主 agent 在 implement 阶段裁定。

### C4：未发现 Effect 顺序依赖问题

Effect 1（scroll）与 Effect 2（latency refresh）无相互依赖、无共享 state 写入冲突（Effect 1 只读 ref，Effect 2 写 latencies）。下沉后分别归源区子组件，无跨边界 effect chain 风险。

### C5：`useKeyboardNavigation` 的 `handleKeyDown` deps 含 `onNavigate` / `onSelect`

调用方传入的 `onNavigate` / `onSelect` 是 `useCallback` 包裹（deps `[]` / `[episodes, onEpisodeClick, getOriginalIndex]`）。拆分后这些 callback 必须随 `<EpisodeSection>` 内部定义，deps 不变即可。研究未发现额外的 stale-closure 风险。
