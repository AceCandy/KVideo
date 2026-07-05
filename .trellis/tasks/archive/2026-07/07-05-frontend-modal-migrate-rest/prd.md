# 迁移剩余 dialog 到通用 Modal

## Goal

将剩余 3 个手写 dialog（`ExportModal`、`AddSourceModal`、`ImportModal`）迁移到通用 `<Modal>`，统一无障碍语义与焦点管理。`SearchHistoryDropdown` 经核实是 `role="listbox"` 下拉（非 dialog），不纳入迁移，并从 spec 清单修正。

## Background

- `<Modal>`（`components/ui/Modal.tsx`）已提供 role/aria-modal/aria-labelledby/焦点 trap/restore/ESC/body-lock，并复用 `ModalBackdrop`。
- 3 个 modal 现状：`<>{backdrop (z-9998)}{fixed container (z-9999, isOpen 控制 opacity/scale)}{glass card + header + body}</>`，无 role/aria-modal/ESC/焦点管理。
- `AddSourceModal` 已用 `ModalHeader`；`ExportModal`/`ImportModal` 用内联 header（标题 + 关闭按钮，与 `ModalHeader` 等价）。
- `ModalHeader` 当前 h3 无 id，无法支撑 `aria-labelledby` → 需加 `titleId` prop。

## Requirements

### R1 `ModalHeader` 增 `titleId`
- 加可选 `titleId?: string`，渲染在 h3 的 `id` 上，供 `<Modal aria-labelledby>` 引用。

### R2 迁移 `ExportModal`
- 用 `<Modal isOpen onClose titleId>` 包裹，删除自管 backdrop + outer fixed container（含 isOpen opacity/scale 过渡，改由 Modal 的 animate-slide-up 进入）。
- 内联 header 换为 `<ModalHeader title onClose titleId>`，标题 id 让 Modal 的 aria-labelledby 生效。
- 内容（checkbox 选项 + 操作按钮 + state）不变。

### R3 迁移 `AddSourceModal`
- 用 `<Modal isOpen onClose titleId>` 包裹，删除自管 `ModalBackdrop` + outer fixed container。
- 现有 `ModalHeader` 加 `titleId`。
- `useAddSourceForm` 表单逻辑、`handleAdd` + toast 接入（batch3a）不变。

### R4 迁移 `ImportModal`
- 同 R2 模式。其内容容器 `max-h-[85vh] flex flex-col` 通过 Modal 的 `className` 或保留在内层 glass div（内层保留更稳，避免改动 Modal 容器默认）。
- 各 Tab（File/Link/Subscription/Json）逻辑不变。

### R5 spec 修正
- `component-guidelines.md` 的 Modal 节：把"未迁移清单"从 4 项改为已完成迁移说明；明确 `SearchHistoryDropdown` 是 listbox 下拉、不用 Modal。

## Out of Scope

- `SearchHistoryDropdown`（listbox，非 dialog）。
- Modal 的退出过渡、portal 化。
- ImportModal 各 Tab 内部的 a11y（仅迁移外壳）。

## Acceptance Criteria

- [ ] 3 个 modal 改用 `<Modal>`，外壳无 role/ESC/焦点管理缺失。
- [ ] `ModalHeader` 支持 `titleId`，标题与 `aria-labelledby` 关联。
- [ ] 各 modal 原有功能不回归（导出/添加源/导入各 Tab）。
- [ ] `npx tsc --noEmit` 通过；改动文件 eslint 无新增告警。
- [ ] spec 清单修正。

## Risks

- `ImportModal` 内容较高（`max-h-[85vh]`）：保留内层 glass div 的 flex/max-h，不依赖 Modal 容器，避免溢出。
- 各 modal 原 `isOpen` 控制的 opacity/scale 过渡被 Modal 的 animate-slide-up 取代（进入动画差异，可接受；退出仍即卸载）。
- 端到端焦点/交互未在浏览器验证，以代码审查 + 与 ConfirmDialog 迁移模式对齐为准。
