'use client';

/**
 * ToastViewport - Renders the global toast stack.
 *
 * Subscribes to the toast list via a narrow selector; callers that only
 * trigger toasts (FavoriteButton, AddSourceModal, ...) do not subscribe and
 * therefore never re-render on toast changes. Z-index sits above the Modal
 * layer (z-[9999]) so toasts remain visible inside open dialogs.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { toastApi, type Toast, type ToastType } from '@/lib/store/toast-store';

interface TypeStyle {
    bar: string;
    icon: ReactNode;
    iconClass: string;
}

const TYPES: Record<ToastType, TypeStyle> = {
    success: {
        bar: 'bg-emerald-500',
        iconClass: 'text-emerald-500',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M20 6L9 17l-5-5" />
            </svg>
        ),
    },
    error: {
        bar: 'bg-red-500',
        iconClass: 'text-red-500',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M18 6L6 18M6 6l12 12" />
            </svg>
        ),
    },
    info: {
        bar: 'bg-[var(--accent-color)]',
        iconClass: 'text-[var(--accent-color)]',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M12 16v-5M12 8h.01" />
                <circle cx="12" cy="12" r="9" />
            </svg>
        ),
    },
    warning: {
        bar: 'bg-amber-500',
        iconClass: 'text-amber-500',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <path d="M12 9v4M12 17h.01" />
            </svg>
        ),
    },
};

function ToastItem({ toast }: { toast: Toast }) {
    // Enter transition: render hidden first frame, then reveal via rAF so the
    // opacity/translate transition actually plays on mount.
    const [shown, setShown] = useState(false);
    useEffect(() => {
        const raf = requestAnimationFrame(() => setShown(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    const style = TYPES[toast.type];
    const dismiss = () => toastApi.getState().dismiss(toast.id);

    return (
        <div
            role="status"
            className={`relative pointer-events-auto flex items-center gap-3 pl-3 pr-2 py-2.5 rounded-[var(--radius-2xl)] bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] shadow-[var(--shadow-md)] overflow-hidden transition-all duration-300 ease-out ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                }`}
        >
            <span className={`absolute left-0 top-0 bottom-0 w-1 ${style.bar}`} aria-hidden="true" />
            <span className={`flex-shrink-0 ${style.iconClass}`}>{style.icon}</span>
            <span className="flex-1 text-sm text-[var(--text-color)] break-words">
                {toast.message}
            </span>
            <button
                onClick={dismiss}
                aria-label="关闭通知"
                className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-[var(--text-color-secondary)] hover:text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--text-color)_10%,transparent)] transition-colors"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

export function ToastViewport() {
    const toasts = useStore(toastApi, (s) => s.toasts);
    if (toasts.length === 0) return null;

    return (
        <div
            aria-live="off"
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[10000] flex flex-col gap-2 w-[90%] max-w-sm pointer-events-none"
        >
            {toasts.map((t) => (
                <ToastItem key={t.id} toast={t} />
            ))}
        </div>
    );
}
