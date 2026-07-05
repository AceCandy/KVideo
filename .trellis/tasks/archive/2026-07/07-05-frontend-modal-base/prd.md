# 通用 Modal 基建（焦点 trap/restore + 语义）与 ConfirmDialog 迁移

## Goal

提供一个通用 `<Modal>` 组件，统一对话框的无障碍语义与焦点管理（焦点 trap、焦点 restore、ESC、body 滚动锁），并迁移 `ConfirmDialog` 作为首个验证。其余 4 个 modal 的迁移留后续渐进进行。

## Background

- 现有 5 个 modal 共性：`<>{backdrop (z-9998)}{fixed content (z-9999)}</>`，但无障碍与焦点管理不一致：
  - `ConfirmDialog`：已有 `role="alertdialog"` / `aria-modal` / ESC / 打开 focus 取消按钮 / body 滚动锁，但**无焦点 trap**（Tab 跳出 modal）、**无焦点 restore**（关闭后焦点丢到 body）。
  - `AddSourceModal` / `ImportModal` / `ExportModal` / `SearchHistoryDropdown`：连 `role` / ESC / 焦点管理都没有。
- `ModalBackdrop`（z-9998，onClick 关闭）、`ModalHeader`（标题 + 关闭按钮）已存在，可复用。

## Requirements

### R1 通用 `<Modal>`（`components/ui/Modal.tsx`）
- Props：`isOpen`、`onClose`、`titleId`（供 `aria-labelledby`）、`role?`（默认 `dialog`，可为 `alertdialog`）、`children`、`initialFocusRef?`（指定初始焦点元素）、`className?`。
- 语义：容器 `role` + `aria-modal="true"` + `aria-labelledby={titleId}`。
- 焦点管理（`isOpen` 为 true 时）：
  - 初始焦点：`initialFocusRef` 指向的元素，否则容器内首个可聚焦元素。
  - 焦点 trap：Tab / Shift+Tab 在容器内可聚焦元素间循环，不跳出。
  - 焦点 restore：记录打开时的 `document.activeElement`，关闭（卸载或 `isOpen→false`）时恢复焦点。
  - ESC 触发 `onClose`。
  - body 滚动锁（`overflow: hidden`），卸载时还原。
- 复用 `ModalBackdrop`（保留 z-9998 + 点击关闭）；容器 z-9999 与现有 modal 一致。
- 进入过渡沿用现有 `animate-slide-up`；`!isOpen` 时 `return null`（与现有 modal 一致，不做退出过渡）。

### R2 迁移 `ConfirmDialog`
- 用 `<Modal>` 替换其 backdrop + 容器 + 自管的 ESC/focus/body-lock 逻辑（这些交给 Modal）。
- 保留 `role="alertdialog"`、`initialFocusRef` 指向取消按钮、内容（标题/正文/按钮）与变体样式不变。
- `titleId` 用 `useId()` 生成，保证多实例唯一。

### R3 spec 沉淀
- `.trellis/spec/frontend/component-guidelines.md` 增补 "Modal / Dialog" 约定：新对话框一律用 `<Modal>`；它包揽 role/aria-modal/焦点 trap/restore/ESC/body-lock，调用方不再自管；现有未迁移 modal（AddSource/Import/Export/SearchHistoryDropdown）列为后续迁移项。

## Out of Scope

- AddSourceModal / ImportModal / ExportModal / SearchHistoryDropdown 的实际迁移（后续渐进；spec 标注）。
- portal 化（现有 fixed 定位在组件树内即可正确工作，portal 收益不抵 SSR 复杂度）。
- 退出过渡（关闭即卸载，与现有 modal 一致）。

## Acceptance Criteria

- [ ] `<Modal>` 提供 role/aria-modal/aria-labelledby、焦点 trap、焦点 restore、ESC、body 滚动锁、初始焦点。
- [ ] `ConfirmDialog` 改用 `<Modal>`，行为（ESC 关闭、打开 focus 取消按钮、确认/取消回调）不回归。
- [ ] 焦点 trap：Tab 在 modal 内循环不跳出；焦点 restore：关闭后焦点回到打开 modal 的元素。
- [ ] `npx tsc --noEmit` 通过；改动文件 eslint 无新增告警。
- [ ] spec 增补 Modal 约定 + 后续迁移清单。

## Risks

- 焦点 trap 的可聚焦元素选择器需覆盖实际控件（button/input/a/[tabindex]）；若漏选某些自定义控件，trap 可能失效——用通用选择器 + 代码审查兜底。
- 焦点 restore 依赖 `document.activeElement` 在打开瞬间正确捕获；若 modal 由非聚焦元素（如键盘外的点击）触发，restore 到该元素仍合理。
- 端到端焦点行为无法在此环境验证（需浏览器），以 WAI-ARIA Dialog 模式 + 代码审查为准。
