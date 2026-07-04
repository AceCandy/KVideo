# Spec 回填设计

## 组织原则（遵循 index.md "How to Fill"）

1. 文档化**项目实际约定**，非理想
2. 含**本项目代码示例**（指向真实文件 / 组件）
3. 列 **forbidden patterns** 及原因
4. 列团队犯过的**常见错误**

## 内容来源策略

- 每个 guide 聚焦 2-4 个来源 task 的 `design.md` / `prd.md` / `implement.md`
- 每条约定必须能指到具体文件 / 组件（conceptual reference，非行号）
- 不发明新规则，只沉淀已有做法

## 素材 → guide 映射

见 `prd.md` 范围表。

## 关键约定（必须沉淀，来自本次教训）

1. **局部组件 vs 全局 UI 原子边界**：`more-menu/ToggleSwitch`（player 浮层菜单局部，button + role=switch + glow）不并入 `ui/Switch`（settings 页全局，checkbox + peer + 50×30）。视觉/语义/场景不同时，并存优于强统一。
2. **shell + 子目录拆分模式**：大组件拆分时，shell 原地保留（调用方 import 路径不变），子组件与共享 types 放同级子目录（`episode-list/`、`more-menu/`、`account/`）。
3. **refs 随 region 下沉**：拆分时 ref / state / effect 整体下沉到 owning region，无需 forwardRef / useImperativeHandle。
4. **视觉零回归 = className 逐字迁移**：抽组件时 className 逐字符等价，用 tsc + build + 逐字核对保证（无浏览器时的替代验证）。
5. **不跳 Trellis Phase 3 步骤**：implement → check → update-spec → commit → archive，缺一不可。

## 边界

- `frontend/` 6 个 guide 全填
- `guides/` 不动（`code-reuse-thinking-guide.md` / `cross-layer-thinking-guide.md` 已有内容）
- `index.md` 更新状态列 + 顶部 Overview（去掉 "Fill in each file" 引导语）

## 结构模板（每 guide 大致遵循）

```
# <Guide>
> 一句话用途
## Overview（项目现状概述）
## <核心约定 1>（含 code 示例 + 文件锚点）
## <核心约定 2>
## Forbidden Patterns（含原因）
## Common Mistakes（团队实际踩过的坑）
```
