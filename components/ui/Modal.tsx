'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { ModalBackdrop } from './ModalBackdrop';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** id of the element that labels this dialog (caller generates via useId). */
    titleId: string;
    role?: 'dialog' | 'alertdialog';
    children: ReactNode;
    /** Element to focus when the dialog opens (defaults to first focusable). */
    initialFocusRef?: RefObject<HTMLElement | null>;
    className?: string;
}

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog shell: owns role/aria-modal, focus trap, focus restore,
 * Escape-to-close, and body scroll lock. Callers render title (with the
 * matching titleId) and body as children; they no longer manage these
 * concerns themselves.
 */
export function Modal({
    isOpen,
    onClose,
    titleId,
    role = 'dialog',
    children,
    initialFocusRef,
    className = '',
}: ModalProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        // Remember the trigger so focus can return there on close.
        previousFocusRef.current = document.activeElement as HTMLElement | null;

        // Move focus into the dialog: explicit target, else first focusable child.
        const target =
            initialFocusRef?.current ??
            containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        target?.focus();

        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }
            if (e.key === 'Tab') {
                const container = containerRef.current;
                if (!container) return;
                const focusables = Array.from(
                    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
                );
                if (focusables.length === 0) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
            previousFocusRef.current?.focus();
        };
    }, [isOpen, onClose, initialFocusRef]);

    if (!isOpen) return null;

    return (
        <>
            <ModalBackdrop isOpen={isOpen} onClose={onClose} />
            <div
                ref={containerRef}
                role={role}
                aria-modal="true"
                aria-labelledby={titleId}
                className={`fixed top-1/2 left-1/2 z-[9999] w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 animate-slide-up ${className}`}
            >
                {children}
            </div>
        </>
    );
}
