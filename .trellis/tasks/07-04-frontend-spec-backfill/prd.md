# 系统性回填 frontend spec

## 背景

`.trellis/spec/frontend/` 下 6 个 guide 全是空模板（"(To be filled by the team)"）。连续多个 refactor task（C1a 展示组件统一、C5a/c/b 大组件拆分、ToggleSwitch 抽取、store 整合、bundle 优化）产出的约定均未沉淀，未来会重复踩坑（例如再次误统一 `ui/Switch` 与 `more-menu/ToggleSwitch`）。

## 目标

把已交付 refactor 的**实际做法**填充进 frontend spec，使其反映项目真实约定（非理想模板），供未来 AI 与人参考。

## 范围（6 个 guide × 来源）

| guide | 填充要点 | 来源 task |
|---|---|---|
| component-guidelines | 拆分模式（partition extraction / 混合策略）、纯展示 vs 自包含、局部 vs 全局原子边界、受控契约、`'use client'` | split-account-settings, split-desktop-more-menu, split-episode-list, extract-toggle-switch |
| directory-structure | shell + 子目录模式（`episode-list/`、`more-menu/`、`account/`）、`ui/` 全局原子边界、`export type` shim 保持调用方路径 | split-*, extract-toggle-switch |
| state-management | localStorage store 原语、Zustand、ref 归属（随 region 下沉）、effect 依赖链保护 | store-consolidation, split-episode-list, split-account-settings |
| hook-guidelines | `useInfiniteSlice`、`useKeyboardNavigation`、`usePlayerSettings`、自定义 hook 抽取时机 | display-component-unify, split-episode-list |
| quality-guidelines | English-only 代码、无 AI 名、surgical changes、无进度词、视觉零回归（className 逐字迁移）、不跳 Trellis check/update-spec | CLAUDE.md + 全部 task 教训 |
| type-safety | Props 契约、`Pick` 切片 props、`export type` shim、disabled 原生拦截 | split-episode-list, extract-toggle-switch |

## 非目标

- 不写理想化 / 教科书内容，只写项目实际约定
- 不为未做的功能写 spec
- 不动 `guides/`（流程指南，本次只填 `frontend/`）
- 不回填后端 task（`07-03-*` 安全系列）的约定

## 验收标准

1. 6 个 frontend guide 各填充实质内容，无 "To be filled by the team" 残留
2. 每条约定能追溯到至少一个项目实际文件 / 组件 / task
3. `component-guidelines` 含「局部 vs 全局原子边界」一节（ToggleSwitch vs Switch.tsx 教训）
4. `directory-structure` 含 shell + 子目录模式
5. `quality-guidelines` 含「不跳 Trellis check / update-spec」一节
6. `index.md` 状态列从 "To fill" 更新为 "Filled"

## 风险

- 素材分散在 10+ archived task，提炼工作量大 → 分 guide 推进，每 guide 聚焦 2-3 个来源
- 易写成空泛 ideal → 每条约定必须锚定项目实际代码 / 文件
