/**
 * Announce a message to screen-reader users via the global polite live region
 * (`#aria-live-announcer` declared in app/layout.tsx). Safe on the server:
 * it early-returns when `document` is undefined, so it can be called from
 * client hooks without SSR guards at the call site.
 *
 * The clear-then-delayed-set pattern helps assistive tech re-announce even
 * when consecutive messages are identical (a single textContent assignment to
 * the same value is often skipped).
 */
export function announce(message: string): void {
    if (typeof document === 'undefined') return;
    const el = document.getElementById('aria-live-announcer');
    if (!el) return;

    el.textContent = '';
    setTimeout(() => {
        el.textContent = message;
    }, 50);
}
