# 提取 ToggleSwitch 原子组件

## 背景

`DesktopMoreMenu`（4 处）与 `DanmakuGroup`（1 处）各自内联了同一套「圆角开关 button + thumb」实现，className 逐字符重复，横屏（isRotated）尺寸分支与受控逻辑一致。`DanmakuGroup` 额外有 disabled 态。`role="switch"` 全局仅这 5 处。

## 目标

抽出受控原子组件 `<ToggleSwitch>`，统一外观、横屏适配、无障碍语义（role=switch + aria-checked），替换 5 处内联实现。

## 范围

- 新建 `components/player/desktop/more-menu/ToggleSwitch.tsx`（player 浮层菜单局部组件，非全局 UI 原子）
- 替换 `DesktopMoreMenu.tsx` 4 处（模式指示器 / 自动下一集 / 跳过片头 / 跳过片尾）
- 替换 `DanmakuGroup.tsx` 1 处（弹幕开关，含 disabled 态）

## 非目标

- 不抽出 ToggleRow（整行 icon+label+toggle）——各行 label 差异大（嵌套 input、"(未配置)"、不同 icon），强行抽 row 违背 simplicity
- 不与 `components/ui/Switch.tsx` 统一——Switch.tsx 是 settings 页采用的 50×30 大号 checkbox 实现（peer + `<input>`），视觉与 player 浮层菜单的小号 glow 开关（button + role=switch）完全不同；强行统一会造成其中一方视觉回归
- 不改动 `AdFilterGroup`（下拉选择器，非 toggle）
- 不引入 forwardRef（当前无外部 ref 需求）
- 不调整任何无关样式

## 验收标准

1. 5 处内联实现全部替换为 `<ToggleSwitch>`，无残留
2. className 逐字符等价（含 isRotated 尺寸分支、disabled 态、thumb 位移条件）
3. 受控 props：`checked` / `onChange` / `isRotated` / `disabled?` / `ariaLabel?`
4. `tsc --noEmit` clean
5. `next build` 通过
6. 无障碍语义保留：`role="switch"` + `aria-checked`
7. `DanmakuGroup` disabled 态视觉/交互保留（opacity-40 + cursor-not-allowed + thumb 不滑开 + DOM `disabled` 透传）

## 风险

- ⚠️ 无本地浏览器/docker，渲染层无法手动验证。靠 className 逐字符比对 + tsc + build 保证零回归。
