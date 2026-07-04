# Spec 回填执行计划

## 顺序（按素材充分度 + 依赖排序）

1. `quality-guidelines.md` — 最通用，来自 CLAUDE.md + 全 task 教训（含本次"不跳 check/update-spec"）
2. `component-guidelines.md` — 素材最丰富（split 三连 + ToggleSwitch）
3. `directory-structure.md` — shell + 子目录模式（依赖 component 约定）
4. `state-management.md` — store 原语 + ref 归属
5. `hook-guidelines.md` — useInfiniteSlice 等
6. `type-safety.md` — Props 契约 + export type shim
7. `index.md` — 状态列 "To fill" → "Filled"，更新 Overview

## 每步流程

- 读对应来源 task 的 `design.md` / `prd.md`（archive/2026-07/）
- 按 design.md 的结构模板写 guide
- 每条约定锚定真实文件 / 组件
- 写完确认无 "To be filled" 残留

## 素材读取清单（按需，不全程扫描）

- `archive/2026-07/07-04-split-account-settings/design.md` — 混合拆分、state 归属
- `archive/2026-07/07-04-split-episode-list/design.md` — partition、refs 下沉
- `archive/2026-07/07-04-split-desktop-more-menu/` — 更多 menu 拆分
- `archive/2026-07/07-04-display-component-unify/design.md` — GridState/CardGrid/useInfiniteSlice
- `archive/2026-07/07-04-extract-toggle-switch/design.md` — 局部 vs 全局边界
- `archive/2026-07/07-04-store-consolidation/` — store 原语
- `archive/2026-07/07-04-bundle-optimization/` — 构建相关（若属于 frontend）

## 验证

- 6 guide 无模板残留
- 每条约定有项目锚点
- `index.md` 状态更新

## Trellis 流程（本次必须走完）

implement → **trellis-check**（独立复核 spec 内容准确、有锚点）→ commit → archive。

注：本 task 的产品就是 spec，故不再额外 update-spec。
