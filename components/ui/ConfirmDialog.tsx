'use client';

import { useId, useRef } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Card } from './Card';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  dangerous?: boolean;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'warning',
  dangerous = false,
}: ConfirmDialogProps) {
  // Focus the cancel button on open (safe default for destructive confirms);
  // Modal handles trap / restore / Escape / scroll lock.
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const variantStyles = {
    danger: 'bg-red-500 hover:bg-red-600',
    warning: 'bg-[var(--accent-color)] hover:brightness-110',
    info: 'bg-blue-500 hover:bg-blue-600',
  };

  const finalVariant = dangerous ? 'danger' : variant;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      role="alertdialog"
      titleId={titleId}
      initialFocusRef={cancelButtonRef}
    >
      <Card className="p-6">
        <h2
          id={titleId}
          className="text-xl font-semibold text-[var(--text-color)] mb-3"
        >
          {title}
        </h2>

        <p className="text-[var(--text-color-secondary)] mb-6 leading-relaxed">
          {message}
        </p>

        <div className="flex gap-3 justify-end">
          <Button
            ref={cancelButtonRef}
            variant="secondary"
            onClick={onCancel}
            className="min-w-[100px]"
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            className={`min-w-[100px] ${variantStyles[finalVariant]}`}
          >
            {confirmText}
          </Button>
        </div>
      </Card>
    </Modal>
  );
}
