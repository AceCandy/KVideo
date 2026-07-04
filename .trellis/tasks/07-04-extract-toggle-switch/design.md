# ToggleSwitch 原子组件设计

## 组件契约

```ts
interface ToggleSwitchProps {
  checked: boolean;       // 开关状态（受控）
  onChange: () => void;   // 点击回调（父级负责 setState）
  isRotated: boolean;     // 横屏尺寸切换
  disabled?: boolean;     // 禁用态（DanmakuGroup 未配置时）
  ariaLabel?: string;     // 无障碍标签（增强，原代码无）
}
```

受控组件：状态由父级持有，ToggleSwitch 不维护内部 state。

## 文件位置

`components/player/desktop/more-menu/ToggleSwitch.tsx`（player 浮层菜单局部组件；与 `components/ui/Switch.tsx` 并存，二者视觉与使用场景不同，见下）。

### 与 Switch.tsx 的关系

项目已存在 `components/ui/Switch.tsx`，被 `PlayerSettings.tsx` / `DisplaySettings.tsx` 采用：基于 `<input type="checkbox">` + peer，尺寸 50×30，无 glow。本次抽取的 player 浮层菜单开关视觉不同（40×24 桌面 / glow shadow / button + role=switch），且仅 player more-menu 体系使用，故作为局部组件置于 more-menu 目录，不与 Switch.tsx 合并。

## className 推导（逐字符等价于现有实现）

button 基础：
```
relative rounded-full transition-all duration-300 flex-shrink-0 border border-white/20
```

button 状态分支：
- `disabled`：`bg-white/5 opacity-40 cursor-not-allowed`
- 非 disabled：
  - `checked`：`bg-[var(--accent-color)] shadow-[0_0_15px_rgba(var(--accent-color-rgb),0.6)] cursor-pointer`
  - unchecked：`bg-white/5 hover:bg-white/10 cursor-pointer`

button 尺寸（isRotated 二选一）：
- 横屏：`w-6 h-3.5`
- 竖屏：`w-8 h-[18px] sm:w-10 sm:h-6`

thumb span 基础：
```
absolute top-0.5 left-0.5 bg-white rounded-full transition-transform duration-300 shadow-[0_2px_4px_rgba(0,0,0,0.4)]
```

thumb 尺寸（isRotated 二选一）：
- 横屏：`w-2.5 h-2.5`
- 竖屏：`w-3.5 h-3.5 sm:w-4.5 sm:h-4.5`

thumb 位移：`(checked && !disabled)` 为真时滑开，否则 `translate-x-0`：
- 横屏：`translate-x-2.5`
- 竖屏：`translate-x-3.5 sm:translate-x-4.5`

## 关键不变量

1. `DanmakuGroup` 原 thumb 条件 `danmakuEnabled && danmakuApiUrl` 等价于 `checked && !disabled`，统一用此推导。
2. `DanmakuGroup` 原 button `disabled={!danmakuApiUrl}` 透传到 DOM，ToggleSwitch 保留 `disabled` prop 透传。
3. 横屏 / 竖屏两套尺寸不可合并，必须按 isRotated 切换。
4. `aria-checked={checked}` 与 `role="switch"` 保留。
5. onClick：disabled 时由 DOM `disabled` 原生拦截，不触发 onChange（`DanmakuGroup` 原本靠 `danmakuApiUrl && setDanmakuEnabled(...)` 守卫，统一为原生 disabled）。
6. 外层「行容器」与 label 不纳入原子（差异大），ToggleSwitch 仅是右侧开关本身。

## 替换映射

| 位置 | checked | disabled | onChange |
|---|---|---|---|
| 模式指示器 | showModeIndicator | — | setShowModeIndicator(!showModeIndicator) |
| 自动下一集 | autoNextEpisode | — | setAutoNextEpisode(!autoNextEpisode) |
| 跳过片头 | autoSkipIntro | — | setAutoSkipIntro(!autoSkipIntro) |
| 跳过片尾 | autoSkipOutro | — | setAutoSkipOutro(!autoSkipOutro) |
| 弹幕 | danmakuEnabled | !danmakuApiUrl | setDanmakuEnabled(!danmakuEnabled) |

## 风险与缓解

- 视觉回归：className 严格逐字符推导，本文件列出完整推导链。
- 无浏览器验证：仅 tsc + build，渲染层标记 ⚠️ 未手动验证。
