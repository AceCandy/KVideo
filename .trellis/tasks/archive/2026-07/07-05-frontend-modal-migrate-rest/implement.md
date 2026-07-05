# Implement — 迁移剩余 dialog

## 顺序（每个 modal 独立可验证）

1. `ModalHeader` 加 `titleId?: string`，h3 `id={titleId}`。
2. `ExportModal`：`<Modal>` 包裹 + 删 backdrop/outer container + 内联 header 换 `ModalHeader`。
3. `AddSourceModal`：`<Modal>` 包裹 + 删 `ModalBackdrop`/outer container + `ModalHeader` 加 `titleId`。
4. `ImportModal`：`<Modal className>` 包裹（内层 glass div 保留 max-h/flex）+ 删 backdrop/outer container + 内联 header 换 `ModalHeader`。
5. spec 修正（清单 + listbox 说明）。
6. `npx tsc --noEmit` + `npx eslint <4 files + ModalHeader>`。

## 模式

每个 modal：
```
// before
return (<>
  <div backdrop z-9998 onClick={onClose} />
  <div fixed z-9999 ... isOpen?opacity/scale>
    <div glass card> <header/> <body/> </div>
  </div>
</>);

// after
const titleId = useId();
return (
  <Modal isOpen={isOpen} onClose={onClose} titleId={titleId} className={...}>
    <div glass card>
      <ModalHeader title onClose titleId={titleId} />  // 或保留内联 header + 给 h3 id
      <body/>
    </div>
  </Modal>
);
```

## 不做

- 不改各 modal 的业务逻辑（表单/导出/Tab）。
- 不改 Modal 组件本身（已交付）。

## 回滚

- 每个 modal 改写独立；出错可单独还原。ModalHeader 加可选 prop 不破坏现有调用（不传则无 id）。
