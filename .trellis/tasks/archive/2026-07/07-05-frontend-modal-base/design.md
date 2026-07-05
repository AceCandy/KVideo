# Design — 通用 Modal 基建

## 组件契约

`components/ui/Modal.tsx`（`'use client'`）：

```
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleId: string;                 // 调用方用 useId() 生成，并赋给标题元素
  role?: 'dialog' | 'alertdialog'; // 默认 'dialog'
  children: React.ReactNode;
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;              // 覆盖容器尺寸/位置
}
```

渲染（`isOpen` 为真时）：
```
<>
  <ModalBackdrop isOpen onClose={onClose} />   // 复用现有 z-9998 backdrop
  <div role aria-modal="true" aria-labelledby={titleId}
       className="fixed top-1/2 left-1/2 z-[9999] w-[90%] max-w-md
                  -translate-x-1/2 -translate-y-1/2 animate-slide-up {className}">
    {children}
  </div>
</>
```

`!isOpen` → `return null`（与现有 modal 一致）。

## 焦点管理（单个 useEffect，依赖 [isOpen, onClose, initialFocusRef]）

进入（isOpen=true）：
1. `previousFocusRef.current = document.activeElement` —— 捕获触发元素。
2. 初始焦点：`initialFocusRef?.current` ?? 容器内首个 `FOCUSABLE` 元素 `.focus()`。
3. `document.body.style.overflow = 'hidden'`。
4. 注册 document `keydown`：
   - `Escape` → `preventDefault` + `onClose()`。
   - `Tab` → 在容器内 `FOCUSABLE` 列表里循环：`Shift+Tab` 且当前是首个 → focus 末个；`Tab` 且当前是末个 → focus 首个。

清理（卸载或 isOpen→false）：
- 移除 keydown 监听；`body.overflow = ''`；`previousFocusRef.current?.focus()` —— 焦点 restore。

`FOCUSABLE` 选择器：
```
'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]),
 select:not([disabled]), [tabindex]:not([tabindex="-1"])'
```

## type 要点

- `initialFocusRef?: React.RefObject<HTMLElement | null>`：调用方传 `useRef<HTMLButtonElement>(null)` 时，因 `RefObject.current` 为 readonly，`RefObject<HTMLButtonElement>` 可协变赋给 `RefObject<HTMLElement>`，类型兼容。

## ConfirmDialog 迁移

- 删除自管的 backdrop、ESC keydown、focus-cancel、body-overflow 三个逻辑。
- `const titleId = useId();`
- `<Modal isOpen onClose={onCancel} role="alertdialog" titleId={titleId} initialFocusRef={cancelButtonRef}>` 包裹原内容。
- 标题 `<h2 id={titleId}>`；其余（Card / message / 按钮 / variant 样式）不变。

## 不做

- 不 portal：现有 fixed-in-tree 模式已正确；portal 增加 SSR mounted 处理，收益不抵成本。
- 不做退出过渡：`!isOpen → null` 与现有 modal 一致。
- 不迁移其余 4 个 modal（spec 列清单）。

## 回滚

- 纯新增 `Modal.tsx` + 改写 `ConfirmDialog.tsx`（逻辑等价、行为增强）。回滚 = 还原两文件。
