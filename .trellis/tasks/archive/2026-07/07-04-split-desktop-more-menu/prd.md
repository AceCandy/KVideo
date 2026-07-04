# PRD: 拆分 DesktopMoreMenu 组件

## 背景
`components/player/desktop/DesktopMoreMenu.tsx` 当前 655 行，是桌面播放器"更多"菜单。JSX 含 9 个功能组（链接复制 / 全屏方式 / 网页全屏尺寸 / 模式指示器 / 广告过滤 / 弹幕 / 自动下集 / 跳过片头 / 跳过片尾），混合了定位算法、portal、3 个 effect 和大量设置项。可读性与改动风险偏高。

事实依据见 `research/desktop-more-menu-structure.md`。

## 目标
抽出两个最大、最自包含的功能组为独立子组件：
- **G6 DanmakuGroup**（弹幕开关 + 子设置，~92 行）
- **G5 AdFilterGroup**（广告过滤，含子菜单，~39 行）

壳层保留定位算法 + portal + effect + 触发按钮 + 其余 7 组。

目标行数：壳层约 500 行，最大子组件 < 130 行。

## 范围（本次）
- 方案 C：抽 G5 + G6 两个子组件
- 子组件各自调 `usePlayerSettings(isPremium)`（避免 9 字段 props 爆炸，详见 design）
- 子组件放 `components/player/desktop/more-menu/` 子目录

## 非目标
- 不抽 G1–G4/G7–G9（G4/G7/G8/G9 是高度相似的 Toggle UI，应配合 `<ToggleSwitch>` 原子重构做独立任务）
- 不动 `calculateMenuPosition` 定位算法、portal 目标分支、3 个 effect
- 不清理 pre-existing orphan（`settingsStore` import、`adFilter`/`setAdFilter` 解构）——独立 commit
- 不重构 `usePlayerSettings` hook 本身
- 不改 500ms fullscreen 轮询逻辑

## 约束（不可破坏的不变量）
1. 对外 props 接口零变化（`DesktopOverlay.tsx` 零改动）
2. `buttonRef`/`menuRef` 必须留壳（`calculateMenuPosition` 依赖，旋转分支 `buttonRef.current?.offsetWidth!`）
3. portal 目标分支 `((isRotated||isFullscreen) && containerRef.current) ? containerRef.current : document.body` 不变
4. MenuContent 容器 `onClick`/`onTouchStart` stopPropagation 保留
5. 50ms 二次校准 effect 依赖 `menuRef` 指向最外层菜单 div
6. G5 子菜单 z-index 层级（z-10 蒙层 / z-20 列表）+ absolute 定位保留
7. G5 `isAdFilterOpen` 留 AdFilterGroup 内部，不上浮
8. `isRotated` 类名三元透传到子组件

## 验收标准
- [ ] `tsc --noEmit` 无新增报错
- [ ] `next build` 通过
- [ ] `DesktopOverlay.tsx` 零改动
- [ ] 菜单各功能行为与拆分前一致（人工对照：展开/关闭/scroll 关闭、广告过滤子菜单、弹幕子设置、定位三模式、复制链接、其余开关）
- [ ] `DesktopMoreMenu.tsx` 壳层行数下降至约 500
- [ ] 无任何业务逻辑被改动（仅搬迁）
