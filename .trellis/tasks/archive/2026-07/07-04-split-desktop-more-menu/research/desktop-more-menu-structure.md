# Research: DesktopMoreMenu 内部结构侦察

- **Query**: 侦察 `components/player/desktop/DesktopMoreMenu.tsx`（655 行）的内部结构，为后续拆分设计提供事实依据
- **Scope**: internal
- **Date**: 2026-07-04
- **目标文件**: `components/player/desktop/DesktopMoreMenu.tsx`

---

## 1. 顶层组件契约

### Props 接口
证据：`components/player/desktop/DesktopMoreMenu.tsx:10-22`

| 字段 | 类型 | 可选 | 默认值 | 用途 |
|---|---|---|---|---|
| `showMoreMenu` | `boolean` | 否 | — | 菜单展开状态 |
| `isPremium` | `boolean` | 是 | `false` | 决定 `usePlayerSettings` 走 premium 还是 global store（`DesktopMoreMenu.tsx:27`, `:65`）|
| `isProxied` | `boolean` | 是 | `false` | 控制复制链接组显示原链接/代理链接两个按钮（`:307-323`）|
| `onToggleMoreMenu` | `() => void` | 否 | — | 切换菜单 + 滚动时自动关闭回调（`:249`, `:268`）|
| `onMouseEnter` / `onMouseLeave` | `() => void` | 否 | — | 鼠标悬停保持菜单（透传到 button 与 MenuContent）|
| `onCopyLink` | `(type?: 'original' \| 'proxy') => void` | 否 | — | 复制链接回调 |
| `webFullscreenSize` | `'full' \| 'large' \| 'focused'` | 否 | — | 网页全屏尺寸当前值 |
| `onCycleWebFullscreenSize` | `() => void` | 否 | — | 循环切换网页全屏尺寸 |
| `containerRef` | `React.RefObject<HTMLDivElement \| null>` | 否 | — | 定位算法的边界容器 + 旋转/全屏模式下 portal 挂载目标 |
| `isRotated` | `boolean` | 是 | `false` | 横屏旋转模式（影响定位、样式、portal 目标）|

### 导出形式
- 命名导出 `export function DesktopMoreMenu`（`DesktopMoreMenu.tsx:24`），**无默认导出**。
- `'use client'` 指令在文件顶部（`DesktopMoreMenu.tsx:1`），是客户端组件。

### createPortal 使用
- 证据：`DesktopMoreMenu.tsx:652`
- 挂载目标条件：`((isRotated || isFullscreen) && containerRef.current) ? containerRef.current : document.body`
  - **正常模式** → `document.body`（脱离容器裁剪）
  - **旋转 / 全屏模式** → `containerRef.current`（留在全屏元素内）
- 仅在 `showMoreMenu && typeof document !== 'undefined'` 时渲染。

---

## 2. 菜单项分组清单

整个 `MenuContent` JSX 节点定义在 `DesktopMoreMenu.tsx:271-634`。按功能分组分解如下：

| # | 分组 | 起止行 | 用途 | 依赖的 usePlayerSettings 字段/setter | 本地 state / props |
|---|---|---|---|---|---|
| G1 | 链接复制组 | `:306-332` | 根据 `isProxied` 渲染 1~2 个复制按钮 | — | `isProxied`, `onCopyLink` |
| — | Divider | `:335` | 分隔线 | — | — |
| G2 | 全屏方式选择 | `:337-358` | 三态循环：auto → native → window | `fullscreenType`, `setFullscreenType`（`:346-348`）| — |
| G3 | 网页全屏尺寸 | `:360-372` | 循环切换尺寸按钮 | — | `webFullscreenSize`, `onCycleWebFullscreenSize` |
| G4 | 模式指示器开关 | `:374-394` | Toggle Switch | `showModeIndicator`, `setShowModeIndicator`（`:381`）| — |
| G5 | 广告过滤选择（含子菜单） | `:396-434` | 下拉子菜单选 4 种模式 | `adFilterMode`, `setAdFilterMode`（`:420`）| 本地 `isAdFilterOpen` / `setAdFilterOpen` |
| — | Divider | `:437` | 分隔线 | — | — |
| G6 | 弹幕开关 + 子设置 | `:439-530` | 总开关 + 透明度/字号/显示区域 | `danmakuEnabled`, `setDanmakuEnabled`, `danmakuApiUrl`, `danmakuOpacity`, `setDanmakuOpacity`, `danmakuFontSize`, `setDanmakuFontSize`, `danmakuDisplayArea`, `setDanmakuDisplayArea` | — |
| G7 | 自动下一集 | `:532-552` | Toggle Switch | `autoNextEpisode`, `setAutoNextEpisode`（`:539`）| — |
| G8 | 跳过片头（含展开输入） | `:554-592` | Toggle + 数值输入 | `autoSkipIntro`, `setAutoSkipIntro`, `skipIntroSeconds`, `setSkipIntroSeconds`（`:562`, `:585`）| — |
| G9 | 跳过片尾（含展开输入） | `:594-632` | Toggle + 数值输入 | `autoSkipOutro`, `setAutoSkipOutro`, `skipOutroSeconds`, `setSkipOutroSeconds`（`:602`, `:625`）| — |

**菜单容器属性**（`:272-305`）：`menuRef` 锚定；`absolute z-[2147483647]`；`onClick`/`onTouchStart` `stopPropagation`；`onMouseEnter/Leave` 透传；style 由 `menuPosition` + `isRotated` 决定。

**注意：导入的 `settingsStore` 与 `adFilter`、`setAdFilter` 字段虽然解构（`:6, :44, :51`）但 JSX 中未实际使用**，属潜在 orphan（拆分时可直接丢弃）。

---

## 3. 状态与 hook 盘点

### usePlayerSettings 解构
证据：`DesktopMoreMenu.tsx:37-65`，调用 `usePlayerSettings(isPremium)`。

**字段（读）**：`autoNextEpisode`, `autoSkipIntro`, `skipIntroSeconds`, `autoSkipOutro`, `skipOutroSeconds`, `showModeIndicator`, `adFilter`（**JSX 未使用**）, `adFilterMode`, `fullscreenType`, `danmakuEnabled`, `danmakuApiUrl`, `danmakuOpacity`, `danmakuFontSize`, `danmakuDisplayArea`

**setter（写）**：`setAutoNextEpisode`, `setAutoSkipIntro`, `setSkipIntroSeconds`, `setAutoSkipOutro`, `setSkipOutroSeconds`, `setShowModeIndicator`, `setAdFilter`（**JSX 未使用**）, `setAdFilterMode`, `setFullscreenType`, `setDanmakuEnabled`, `setDanmakuOpacity`, `setDanmakuFontSize`, `setDanmakuDisplayArea`

> hook 返回的 `proxyMode`/`setProxyMode`/`setDanmakuApiUrl`/`setAdKeywords` 未被解构，因为本组件不需要。

### useRef
- `buttonRef = React.useRef<HTMLButtonElement>(null)`（`:67`）— 触发按钮，定位算法起点
- `menuRef = React.useRef<HTMLDivElement>(null)`（`:68`）— 菜单容器，定位算法读取 `offsetHeight`

### useState
- `menuPosition`（`:69`）：`{ top, left, maxHeight, openUpward, align: 'left' | 'right' }`，定位结果
- `isAdFilterOpen`（`:70`）：广告过滤子菜单展开
- `isFullscreen`（`:84`）：当前是否全屏（native 或 web fullscreen CSS 类）

### 常量映射（每次 render 重建，未 useMemo）
- `AD_FILTER_LABELS`（`:72-77`）：`off/keyword/heuristic/aggressive` → 中文标签
- `WEB_FULLSCREEN_SIZE_LABELS`（`:78-82`）：`full/large/focused` → 中文标签

### useEffect
1. **Fullscreen 监听**（`:86-101`，deps `[containerRef]`）
   - `fullscreenchange` 事件 + **500ms 轮询**（检测 CSS 类 `.is-web-fullscreen`）。
   - 设置 `setIsFullscreen(native || webFullscreen)`。
   - **副作用**：500ms setInterval 全局轮询会一直跑，关闭菜单也不停（潜在优化点，但**不要在拆分任务中动**）。

2. **滚动自动关闭**（`:245-254`，deps `[showMoreMenu, onToggleMoreMenu]`）
   - 仅在菜单展开时挂载，`scroll` 事件 → 调用 `onToggleMoreMenu()`。

3. **菜单定位**（`:256-262`，deps `[showMoreMenu, calculateMenuPosition, isRotated]`）
   - 展开时立刻调用 + 50ms 延迟二次校准。

### useCallback
- `calculateMenuPosition`（`:104-240`，deps `[containerRef, isRotated, isFullscreen]`）
  - 三分支定位算法：正常 / 全屏 / 旋转。详见 §4。

### 派生函数
- `handleToggle`（`:264-269`）：打开前先 `calculateMenuPosition()`，再 `onToggleMoreMenu()`。

---

## 4. createPortal 与定位逻辑

### Portal 目标（`DesktopMoreMenu.tsx:652`）
```
((isRotated || isFullscreen) && containerRef.current) ? containerRef.current : document.body
```
- Portal 内：整个 `MenuContent`（G1–G9 全部）
- Portal 外：触发 button（`:638-648`）

### menuPosition 算法（`calculateMenuPosition`，`:104-240`）

三分支（由 `isRotated` 和 `isFullscreen` 决定）：

| 分支 | 行号 | 坐标系 | Portal 目标 | 空间计算关键 |
|---|---|---|---|---|
| **Normal**（非旋非全屏）| `:107-149` | Viewport（`getBoundingClientRect`）| `document.body` | `spaceBelow = vh - buttonRect.bottom - 10` |
| **Fullscreen**（非旋转）| `:150-190` | Container-relative（offsetParent 累加循环）| `containerRef` | 同上但用 containerWidth/Height |
| **Rotated** | `:191-239` | Container-relative + 坐标轴换算 | `containerRef` | X/Y 轴互换（landscape 视角）|

**关键不变量**：
- `openUpward = spaceBelow < min(menuHeight, 300) && spaceAbove > spaceBelow`（三分支一致，阈值 300）
- `maxHeight = openUpward ? min(spaceAbove, menuHeight) : min(spaceBelow, vh*0.7)`
- 水平对齐 `align`：按按钮中心在容器/视口的左半/右半决定 `left`/`right`
- 旋转模式坐标轴换算：menuPosition.left 实为容器 X（landscape 垂直），top 实为容器 Y（landscape 水平），见 `:276-298` 的 style 分支

**menuHeight 估算**：默认 450，若 `menuRef.current?.offsetHeight` 已存在则用实际值（`:119`, `:172`, `:219`）— **隐含不变量**：menu 必须先渲染（mount）才能拿到真实高度，二次校准靠 50ms timer。

### 风险点
- 全屏/旋转分支依赖 `containerRef.current` 非 null（`:105`），若 null 直接 return（不定位）。
- 旋转分支的 `buttonRef.current?.offsetWidth!`（`:286`）使用 `!` 非空断言，理论上 `buttonRef.current` 已 mount，但属脆弱假设。

---

## 5. imports 分类

证据：`DesktopMoreMenu.tsx:1-8`

| 类别 | import | 服务分组 | 拆分时是否可整体带走 |
|---|---|---|---|
| React | `React`（`:3`） | 全局 | 留壳层 |
| 三方 | `createPortal` from `react-dom`（`:8`） | 壳层 portal | **留壳层**（定位 + portal 是壳层职责）|
| UI | `Icons` from `@/components/ui/Icon`（`:4`） | G1–G9 几乎全用 | 子组件各自按需 import |
| Hook | `usePlayerSettings` from `../hooks/usePlayerSettings`（`:5`） | G2–G9 | **关键决策点**（见 §7）|
| Store | `settingsStore, AdFilterMode` from `@/lib/store/settings-store`（`:6`） | `AdFilterMode` 类型用于 G5（`:420`）；`settingsStore` **未被 JSX 使用**（orphan）| G5 带走 `AdFilterMode` 类型；`settingsStore` 可删 |

**Orphan import**：`settingsStore`（`:6`）解构后未使用，`adFilter`/`setAdFilter`（`:44, :51`）未使用。

---

## 6. 调用方

**全仓唯一调用点**：`components/player/desktop/DesktopOverlay.tsx`

- import：`DesktopOverlay.tsx:4`
- JSX：`DesktopOverlay.tsx:93-105`

传递的 props（全部透传自 DesktopOverlay 自己的 props）：
```
showMoreMenu, isPremium, isProxied,
onToggleMoreMenu, onMouseEnter (onMoreMenuMouseEnter), onMouseLeave (onMoreMenuMouseLeave),
onCopyLink, webFullscreenSize, onCycleWebFullscreenSize,
containerRef, isRotated
```

DesktopOverlay 本身也是 props 透传壳（`DesktopOverlay.tsx:31, 41-44`），上游来源是 `DesktopVideoPlayer`。**只有 1 个调用点 → 拆分不会破坏对外 API**。

---

## 7. 可拆分边界建议

> 仅基于事实给出候选拆分维度与权衡，不推荐"最佳"方案。

### 关键决策：usePlayerSettings 放在哪一层

| 选项 | 描述 | 优点 | 缺点 |
|---|---|---|---|
| **A. 壳层调一次 + props 下传** | DesktopMoreMenu 调 `usePlayerSettings(isPremium)`，把字段+setter 拆成多个 props 传给各子组件 | 单一数据源，订阅最小化 | props 接口爆炸（约 26 个字段透传）|
| **B. 每个子组件各自调 hook** | 每个分组子组件内部调 `usePlayerSettings(isPremium)` | 子组件自洽，props 极简 | 多份订阅（实际 hook 内部 subscribe 是 idempotent，但 `useState` snapshot 会重复）|
| **C. Context 下发** | 壳层调 hook，用 Context.Provider 下发 | 折中 | 增加一层 Provider，调试复杂 |

**事实提示**：`usePlayerSettings`（`hooks/usePlayerSettings.ts:67-82`）每次调用都会 `useState` + `subscribe` 两个 store。每个组件树挂载点都会独立触发一次 snapshot 订阅。选项 B 在 React 18 自动 batch 下性能可接受，但语义上重复订阅。

### 方案 A：按功能组抽子组件
建议拆分（按 §2 表格的 G1–G9）：

| 子组件（候选） | 来源行 | 行数（估） | 自身状态 | 依赖 hook 字段数 |
|---|---|---|---|---|
| `CopyLinkGroup` | G1 `:306-332` | ~27 | 0 | 0 |
| `FullscreenModeGroup` | G2 `:337-358` | ~22 | 0 | 2 (`fullscreenType`/`setFullscreenType`) |
| `WebFullscreenSizeGroup` | G3 `:360-372` | ~13 | 0 | 0（纯 props）|
| `ModeIndicatorGroup` | G4 `:374-394` | ~21 | 0 | 2 |
| `AdFilterGroup`（含子菜单）| G5 `:396-434` | ~39 | 1 (`isAdFilterOpen`) | 2 (`adFilterMode`/`setAdFilterMode`) |
| `DanmakuGroup`（含子设置）| G6 `:439-530` | ~92 | 0 | 9 |
| `AutoNextEpisodeGroup` | G7 `:532-552` | ~21 | 0 | 2 |
| `SkipIntroGroup` | G8 `:554-592` | ~39 | 0 | 4 |
| `SkipOutroGroup` | G9 `:594-632` | ~39 | 0 | 4 |

- **风险**：G6 弹幕组最大（~92 行），独立拆分收益最高但依赖字段最多。
- **对外 props 接口**：DesktopMoreMenu 对外接口**不变**（唯一调用方 DesktopOverlay 不需改）。
- **重复 Toggle UI**：G4/G7/G8/G9 的 Switch 视觉结构高度相似（圆球 + translate-x），可考虑抽 `<ToggleSwitch>` 原子，但**这是另一个独立重构点**，不在本拆分范围。

### 方案 B：hook + 纯展示
- 抽 `useDesktopMoreMenuPosition({ containerRef, isRotated, isFullscreen, buttonRef, menuRef })` 容纳 §3 的 `calculateMenuPosition` + 三个 useEffect + `menuPosition` state（约 `:69-262`，~190 行）。
- DesktopMoreMenu 壳层保留：hook 调用、portal、button、MenuContent 容器。
- 子组件采用方案 A 的分组。
- **风险**：定位 hook 需要小心 ref 生命周期（buttonRef/menuRef 由壳层持有，hook 借用）。
- **对外 props 接口**：不变。

### 方案 C：最小风险增量
仅先拆 **G6 弹幕组**（最大块 ~92 行，9 个 hook 字段）+ **G5 广告过滤组**（~39 行，含子菜单）。
- 剩余 G1–G4, G7–G9 保持在 DesktopMoreMenu 内。
- 风险最低：壳层仍持有定位 + portal + 大部分 JSX。
- **对外 props 接口**：不变。
- 估算：655 行 → 壳层约 500 行 + DanmakuGroup 92 + AdFilterGroup 39。

### 共同风险点（所有方案）
1. **isRotated 类名爆炸**：几乎所有分组的 className 都有 `${isRotated ? '...' : '...'}` 三元，子组件必须接收 `isRotated` prop（统一透传）。
2. **stopPropagation**：MenuContent 容器（`:303-304`）和 input（`:483`, `:587`, `:627`）都依赖 `stopPropagation` 防冒泡触发外部点击关闭；拆分时子组件的 onClick 不能丢。
3. **menuHeight 二次校准**：50ms timer（`:259`）依赖 `menuRef` 在 menu 重新渲染后仍指向同一 DOM 节点；若子组件改变了 DOM 结构，可能影响 offsetHeight 读取。

---

## 8. 风险与不变量

### 不变量（拆分时绝不能破坏）

1. **Portal 目标分支逻辑**（`:652`）：旋转/全屏必须 portal 到 `containerRef.current`，否则在全屏元素外不可见。子组件结构改动不影响此处，但若 MenuContent 内部嵌套 ref 改变，`menuRef` 必须仍指向最外层菜单 div。

2. **menuPosition 与 MenuContent style 的耦合**（`:275-300`）：旋转分支使用 `buttonRef.current?.offsetWidth!`（`:286`），意味着 MenuContent 渲染期间 buttonRef 不能为 null。拆分后 button 必须留在壳层（不在任何子组件内）。

3. **scroll 自动关闭**（`:245-254`）：依赖 `onToggleMoreMenu` 在 scroll 时被调用。子组件的 `stopPropagation`（`:303-304`）阻止菜单内部交互冒泡到外部点击关闭逻辑（如果有），不能丢。

4. **Fullscreen 500ms 轮询**（`:95`）：检测 `.is-web-fullscreen` CSS 类。该 effect 依赖 `containerRef.current?.closest('.is-web-fullscreen')`（`:90`），意味着 containerRef 必须在挂载后才有意义。拆分 hook 时需保留 `containerRef` 依赖。

5. **广告过滤子菜单**（G5, `:412-432`）：
   - 本地 `isAdFilterOpen` 控制；
   - 子菜单用 `fixed inset-0 z-10`（`:414`）做点击外部关闭蒙层；
   - 点击蒙层 → `setAdFilterOpen(false)`；
   - 子菜单相对父按钮 `absolute right-0 top-full mt-2`（`:415`）。
   - 拆 AdFilterGroup 时，**`isAdFilterOpen` 必须留在 AdFilterGroup 内部**（不需上浮），但 z-index 层级（`z-10` 蒙层 / `z-20` 列表）必须保留。

### 行为正确性依赖

- **键盘交互**：本组件**没有**键盘事件处理（无 onKeyDown / Escape 关闭），依赖外部（DesktopOverlay / document）处理。拆分时无需迁移键盘逻辑（因为不存在）。
- **点击外部关闭**：MenuContent 自身用 `onClick={e => e.stopPropagation()}`（`:303`）阻止内部点击冒泡，真正的"点击外部关闭"逻辑应在调用方（DesktopOverlay 的 `onMouseLeave` 等）。**事实**：本文件内没有 `document.addEventListener('click', ...)` 形式的外部点击监听。

### Orphan（潜在清理项，**不属于本拆分任务范围**，仅记录）
- `settingsStore` import（`:6`）— 未在 JSX 中使用
- `adFilter` / `setAdFilter` 解构（`:44, :51`）— 未在 JSX 中使用

> 这两项可在拆分时顺手移除，但根据项目"手术刀式改动"原则，建议作为独立小 commit。

---

## 关键发现 TL;DR

1. **唯一调用方** DesktopOverlay（`DesktopOverlay.tsx:93`），对外 props 接口**可保持完全不变**。
2. **JSX 共 9 个功能组**（G1–G9），其中 **G6 弹幕组 ~92 行**最大、依赖 9 个 hook 字段；G5 广告过滤含子菜单 + 本地 state。
3. **定位 + portal + 3 个 useEffect + 1 个 useCallback** 共约 190 行，是壳层核心，**不应下沉到子组件**。
4. **Orphan**：`settingsStore`、`adFilter`、`setAdFilter` 解构但未使用。
5. **关键耦合不变量**：`menuRef`/`buttonRef` 必须留在壳层；旋转分支用 `buttonRef.current?.offsetWidth!`；portal 目标分支依赖 `containerRef.current`。
