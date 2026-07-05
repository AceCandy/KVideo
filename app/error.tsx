'use client';

import { useEffect } from 'react';
import { Icons } from '@/components/ui/Icon';

// Route-segment error boundary: catches unhandled errors in any route's
// React tree so a single throw no longer blanks the whole page. ThemeProvider
// is still mounted here (only root-layout failures fall through to global-error),
// so glass tokens and CSS variables are safe to use.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div
        className="player-error-glass animate-in fade-in zoom-in-95 duration-300 max-w-md w-full text-center"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div className="relative">
          <Icons.AlertTriangle size={56} className="error-icon mx-auto mb-4" />
          <div className="absolute inset-0 blur-xl bg-red-500/30 rounded-full -z-10" />
        </div>
        <h3>出错了</h3>
        <p>页面加载时发生异常，请重试。</p>
        <div className="flex gap-3 justify-center flex-wrap mt-2">
          <button
            onClick={reset}
            className="btn-glass px-4 py-2 flex items-center gap-2 !bg-[var(--accent-color)]/80 hover:!bg-[var(--accent-color)]"
          >
            <Icons.RefreshCw size={18} />
            <span>重试</span>
          </button>
        </div>
      </div>
    </div>
  );
}
