/**
 * Toast Store - Transient global toast notifications.
 *
 * Vanilla store (no persistence): toasts are short-lived UI feedback, so there
 * is no reason to survive reloads. Mirrors the favorites-store pattern
 * (createStore + useStore) so callers import a plain `toast` object instead of
 * going through a React Context, and only ToastViewport subscribes to the list.
 */

import { createStore } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration: number;
}

interface ToastState {
    toasts: Toast[];
}

interface ToastInput {
    id?: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastActions {
    push: (toast: ToastInput) => string;
    dismiss: (id: string) => void;
    clear: () => void;
}

type ToastStore = ToastState & ToastActions;

const MAX_TOASTS = 4;

const DEFAULT_DURATION: Record<ToastType, number> = {
    success: 3000,
    info: 3000,
    warning: 3000,
    error: 4000,
};

// Monotonic id counter — stable across SSR/CSR, avoids Date.now/Math.random.
let seq = 0;
// Pending auto-dismiss timers, cleared on explicit dismiss to avoid leaks.
const timers = new Map<string, ReturnType<typeof setTimeout>>();

export const toastApi = createStore<ToastStore>()((set, get) => ({
    toasts: [],

    push: ({ id, type, message, duration }) => {
        const toastId = id ?? `toast-${++seq}`;
        const resolvedDuration = duration ?? DEFAULT_DURATION[type];

        set((state) => {
            // Drop a duplicate with the same id, then prepend and trim to MAX_TOASTS.
            const filtered = state.toasts.filter((t) => t.id !== toastId);
            const next = [{ id: toastId, type, message, duration: resolvedDuration }, ...filtered];
            return { toasts: next.slice(0, MAX_TOASTS) };
        });

        // Schedule auto-dismiss; clear any prior timer for the same id first.
        const existing = timers.get(toastId);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(() => {
            timers.delete(toastId);
            get().dismiss(toastId);
        }, resolvedDuration);
        timers.set(toastId, timer);

        return toastId;
    },

    dismiss: (id) => {
        const timer = timers.get(id);
        if (timer) {
            clearTimeout(timer);
            timers.delete(id);
        }
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    },

    clear: () => {
        timers.forEach((timer) => clearTimeout(timer));
        timers.clear();
        set({ toasts: [] });
    },
}));

type ToastOptions = { duration?: number; id?: string };

function make(type: ToastType) {
    return (message: string, options?: ToastOptions): string =>
        toastApi.getState().push({ type, message, duration: options?.duration, id: options?.id });
}

/**
 * Convenience namespace for callers. Import and call directly from any client
 * event handler — no hook or Provider required. e.g. `toast.success('已收藏')`.
 */
export const toast = {
    success: make('success'),
    error: make('error'),
    info: make('info'),
    warning: make('warning'),
    dismiss: (id: string) => toastApi.getState().dismiss(id),
};
