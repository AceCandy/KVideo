# Design: 拆分 DesktopMoreMenu 组件

依据：`research/desktop-more-menu-structure.md`

## 核心约束（决定拆分形态）

DesktopMoreMenu 的壳层核心是：定位算法 `calculateMenuPosition`（三分支 ~140 行）+ 3 个 useEffect（fullscreen 500ms 轮询 / scroll 关闭 / 50ms 二次校准）+ createPortal 目标分支。共约 190 行，**不可下沉**——`buttonRef`/`menuRef` 必须留壳（旋转分支用 `buttonRef.current?.offsetWidth!`），portal 目标依赖 `containerRef.current`。

本次只抽两个最大、最自包含的功能组（方案 C）：
- **G6 DanmakuGroup**（~92 行，9 个 hook 字段）—— 最大块，收益最高
- **G5 AdFilterGroup**（~39 行，含子菜单 + 本地 state `isAdFilterOpen`）—— 独立性高

其余 7 组（G1–G4, G7–G9）留壳。原因：G4/G7/G8/G9 是高度相似的 Toggle UI，抽出会产生重复 Toggle 组件，应配合 `<ToggleSwitch>` 原子重构（独立任务）；G1/G3 太小（<30 行）收益边际。

## usePlayerSettings 调用层决策

采用**选项 B：子组件各自调 `usePlayerSettings(isPremium)`**，而非壳层调一次再 props 透传。

理由：
- G6 需要 9 个字段 + 4 个 setter，壳层透传将产生约 13 个 props，接口爆炸
- 子组件各自调，props 极简（仅 `isPremium` + `isRotated`）
- 菜单仅在 `showMoreMenu` 展开时渲染子组件，是临时态，重复订阅开销可忽略
- `usePlayerSettings` 内部 subscribe 是 store 的 listener 注册，多组件订阅同一 store 是正常 React 模式
- 各子组件 re-render 边界清晰：弹幕设置变化只触发 DanmakuGroup re-render

## 拆分形态

```
DesktopMoreMenu.tsx（壳，约 500 行，对外 props 不变）
├─ usePlayerSettings(isPremium)        留壳组（G2/G4/G7/G8/G9）使用
├─ calculateMenuPosition + 3 effect    定位核心，不可下沉
├─ createPortal(...)                   目标分支不变
├─ <button ref={buttonRef}/>           触发按钮（buttonRef 留壳）
└─ <MenuContent ref={menuRef}/>        内含 G1–G4/G7–G9 + 两个新子组件
    ├─ G1–G4, G7–G9                    原样留壳
    ├─ <AdFilterGroup isPremium isRotated/>
    └─ <DanmakuGroup isPremium isRotated/>

新建：
  desktop/more-menu/AdFilterGroup.tsx
  desktop/more-menu/DanmakuGroup.tsx
```

文件布局：子组件放 `components/player/desktop/more-menu/` 子目录；`DesktopMoreMenu.tsx` 原地保留（调用方 import 路径不变）。

## 各组件契约

**AdFilterGroup**（G5，原 `:396-434`）
- `props: { isPremium: boolean, isRotated: boolean }`
- 内部 `usePlayerSettings(isPremium)` 取 `adFilterMode`, `setAdFilterMode`
- 内部 state：`isAdFilterOpen`, `setAdFilterOpen`
- 内部常量：`AD_FILTER_LABELS`
- 内部 import `AdFilterMode` 类型 from `@/lib/store/settings-store`
- 保留不变量：子菜单蒙层（`fixed inset-0 z-10`，点击关闭）+ 列表（`absolute right-0 top-full mt-2 z-20`）+ onClick stopPropagation

**DanmakuGroup**（G6，原 `:439-530`）
- `props: { isPremium: boolean, isRotated: boolean }`
- 内部 `usePlayerSettings(isPremium)` 取 `danmakuEnabled`/`setDanmakuEnabled`, `danmakuApiUrl`（只读）, `danmakuOpacity`/`setDanmakuOpacity`, `danmakuFontSize`/`setDanmakuFontSize`, `danmakuDisplayArea`/`setDanmakuDisplayArea`
- 保留不变量：input `stopPropagation`（防冒泡触发外部关闭）、`isRotated` 类名三元

## 状态归属

| 项 | 归属 | 原因 |
|---|---|---|
| menuPosition, isFullscreen | 壳 | 定位核心 |
| buttonRef, menuRef | 壳 | calculateMenuPosition 依赖 |
| isAdFilterOpen | AdFilterGroup | 子菜单展开是局部 UI 态 |
| AD_FILTER_LABELS | AdFilterGroup | 仅 G5 用 |
| WEB_FULLSCREEN_SIZE_LABELS | 壳 | G3 用 |
| usePlayerSettings 字段 | 各组件各自调 | 避免 props 爆炸 |

## 不变量保留（逐条对照原代码）
1. `buttonRef`/`menuRef` 留壳（calculateMenuMenu 依赖，旋转分支 `buttonRef.current?.offsetWidth!`）
2. portal 目标分支 `((isRotated||isFullscreen) && containerRef.current) ? containerRef.current : document.body` 不变
3. MenuContent 容器 onClick/onTouchStart stopPropagation 保留
4. 50ms 二次校准 effect 依赖 menuRef 指向最外层菜单 div（子组件在内部，不影响）
5. G5 子菜单 z-index（z-10 蒙层 / z-20 列表）+ absolute 定位保留
6. G5 `isAdFilterOpen` 留 AdFilterGroup 内部，不上浮
7. 对外 props 接口零变化（DesktopOverlay 零改动）
8. `isRotated` 类名三元透传到两个子组件

## 风险与缓解
- **menuHeight 二次校准**：抽出 G5/G6 后 MenuContent 高度变化，但 menuRef 仍指向最外层菜单 div，offsetHeight 反映真实总高度，50ms 二次校准自动适应。
- **isRotated 类名透传**：G5/G6 内部所有 `${isRotated ? ... : ...}` 必须保留，通过 prop 传入。
- **重复订阅**：3 处 usePlayerSettings 调用（壳 + AdFilter + Danmaku），菜单临时态可接受。

## 兼容性
- 调用方 `components/player/desktop/DesktopOverlay.tsx` 零改动
- 对外 props 接口零变化

## 不在本次范围
- orphan 清理（`settingsStore` import、`adFilter`/`setAdFilter` 解构）：pre-existing dead code，独立 commit
- G4/G7/G8/G9 Toggle 重复：配合 `<ToggleSwitch>` 原子重构，独立任务
- 定位算法 / portal / effect：不动
