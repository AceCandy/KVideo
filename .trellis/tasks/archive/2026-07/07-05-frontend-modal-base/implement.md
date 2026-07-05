# Implement — 通用 Modal 基建

## 顺序

1. 新建 `components/ui/Modal.tsx`：props + 单 useEffect 焦点管理（trap/restore/初始焦点/ESC/body-lock）+ 复用 ModalBackdrop + `!isOpen` return null。
   - 验证：typecheck。
2. 重构 `components/ui/ConfirmDialog.tsx`：用 `useId` + `<Modal>` 包裹，删除自管 backdrop/ESC/focus/overflow；保留内容与变体样式。
   - 验证：typecheck；行为对照（ESC→onCancel、打开 focus 取消按钮、确认→onConfirm）。
3. spec：`component-guidelines.md` 增补 "Modal / Dialog" 节（新对话框用 `<Modal>`；后续迁移清单）。
   - 验证：文档自洽。

## 验证命令

- `npx tsc --noEmit`（必过）
- `npx eslint components/ui/Modal.tsx components/ui/ConfirmDialog.tsx`（无新增告警）

## 不做

- 不迁移 AddSourceModal / ImportModal / ExportModal / SearchHistoryDropdown（spec 标注后续）。
- 不引入 portal、不做退出过渡。

## 回滚点

- 步骤 1 独立新增；步骤 2 改写单文件；任意步出错可单独还原，不影响其他 modal（未迁移）。
