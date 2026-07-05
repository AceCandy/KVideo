# UI 精修：玻璃一致性、动效细节、阴影 token 收口

## Goal

在不偏离 DESIGN.md "Clear Glass Theater" 理念的前提下，修复玻璃/动效实现层的现存问题，补齐暗色氛围与海报卡交互，并将散落的阴影硬编码收口为 token，整体提升首屏质感与一致性。

## Background

基于对 `DESIGN.md`、`app/styles/*.css`、`components/layout/Navbar.tsx`、`components/ui/PosterCard.tsx`、`components/home/PopularFeatures.tsx` 的代码核查，发现三类问题：实现层小缺陷、缺失的氛围细节、DESIGN.md 已定义但未落地的规范。本任务一次性收口。

## Requirements

### A. 实现层缺陷修复（先做，低风险）

1. **输入框焦点阴影去重**：`app/styles/glass.css` 的 `.glass-input:focus` 删除首行硬编码 `box-shadow: 0 0 0 3px rgba(0,122,255,0.3)`，仅保留基于 `var(--accent-color)` 的 `color-mix` 声明。
2. **胶囊滑块过渡时长**：`components/home/PopularFeatures.tsx` 中内容类型胶囊滑块的 `duration-400`（Tailwind v4 默认 scale 不存在该档位、且项目无 `@theme` 扩展）替换为合法档位，使滑动指示器过渡时长落在预期量级。
3. **导航栏玻璃一致性**：`components/layout/Navbar.tsx` 的 sticky 导航补 `backdrop-blur`，使其在滚动时与 `PopularFeatures` 胶囊、`Modal` 等玻璃表面处理一致，避免下方内容透出糊化。

### B. 美化提升（DESIGN.md 允许空间内）

4. **暗色背景氛围**：增强 `--bg-image-dark`，加入微妙径向高光，强化 "Cinema Black" 层次感；不引入高饱和霓虹或夸张渐变。
5. **海报卡 hover 交互**：`PosterCard` hover 时给海报图本身加轻微缩放，并叠加底部渐变遮罩以提升标题/角标可读性；不破坏 "Poster Carries Color Rule"。
6. **阴影 token 收口**：在 `app/styles/variables.css` 补 `--shadow-lg`（hover lift `0 8px 24px var(--shadow-color)`）与 `--shadow-focus-glow`（`0 0 0 3px color-mix(... accent 30%, transparent)`），替换 `glass.css` 等处散落硬编码。
7. **Loading 骨架屏**：`components/home/MovieGrid` 的 loading 分支用骨架卡替代/补充纯 spinner，落实 DESIGN.md "不要只用 spinner" 的要求。
8. **入场错位动效**：复用现有 `transitions.css` 动画，为网格卡片提供 staggered（错位）入场，克制不喧宾夺主。

## Acceptance Criteria

- [x] `.glass-input:focus` 仅保留一条基于 token 的 `box-shadow` 声明。
- [x] 内容类型胶囊滑块过渡时长为预期量级（duration-400 → duration-300）。
- [x] Navbar sticky 状态下滚动时背景不糊（已应用 `backdrop-blur-xl`）。
- [x] 暗色模式背景具备可感知的层次感（顶部 5% 白径向高光，未引入彩色装饰）。
- [x] 海报卡 hover 出现图片缩放与底部渐变遮罩（已上提到 PosterCard 骨架，清理两处重复）。
- [x] `--shadow-lg` / `--shadow-focus-glow` token 存在，MovieCard/PremiumContentGrid 的 `0 8px 24px` 与 glass.css 焦点光晕已替换。
- [x] `MovieGrid` 首屏 loading 渲染骨架卡（GridSkeleton）。
- [x] 网格卡片以错位方式入场（`.stagger-fade`，含 prefers-reduced-motion 兜底）。
- [x] 类型检查（`tsc --noEmit`）通过；改动文件无新增 lint 错误（PopularFeatures:57 为预存 react-hooks 报错，与本次无关）；改动未违反 DESIGN.md "Don'ts"。

## Verification Notes

- `npx tsc --noEmit` 退出码 0。
- `npm run lint`：改动文件中仅 PopularFeatures.tsx 有一条预存 `setState-in-effect` 报错（57 行 useEffect，不在本次改动范围）；其余改动文件无报错。项目预存 140 errors / 72 warnings 集中在 `lib/utils/*`，与本次无关。
- 渐变遮罩使用 `bg-gradient-to-t`，与项目既有用法（iptv-controls / DesktopControls / TopBar）一致。

## Out of Scope (后续可单独处理)

- ~~`VideoCard` / `VideoGroupCard` 的 `cardInnerClassName` 仍用 Tailwind 默认 `shadow-sm` / `hover:shadow-lg`~~：已补做，切到 `--shadow-sm` / `--shadow-lg` token。
- ~~`PopularFeatures.tsx` 胶囊指示器发光硬编码 iOS 蓝~~：已补做，改用 `rgba(var(--accent-color-rgb),0.4)`，跟随明暗 accent。

（暂无遗留）

## Constraints

- 严格遵循 `DESIGN.md` 的 Do's / Don'ts 与命名规则（One Blue Rule、Glass Contrast Rule、State Earns Shadow Rule、Glass Is Not Fog 等）。
- 仅做最小必要改动，不顺手重构无关代码；遵循"surgical changes"。
- 保持明/暗双模式可用，不破坏移动端、TV/remote 适配。
- 所有面向用户文案为中文；代码标识符英文。

## Non-goals

- 不重做设计系统、不调整品牌色板、不替换字体栈。
- 不引入新依赖。
- 不改动与本次无关的页面（player / iptv / favorites / settings 的结构），除非某项 token 收口自然波及。

## Notes

- 实现顺序：先 A 类三项缺陷修复，再 B 类按性价比（暗色氛围 → 海报卡 → 阴影 token → 骨架屏 → 错位动效）。
- 每一项完成后报告，便于逐项回滚。
