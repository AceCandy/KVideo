'use client';

import { useEffect } from 'react';
import './globals.css';

// Root error boundary: replaces app/layout.tsx when the root layout itself
// throws. Must define its own <html>/<body> and must NOT depend on providers
// mounted inside the root layout (ThemeProvider, etc.) — hence inline styles
// and hardcoded colors instead of glass tokens / CSS variables.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            color: '#fff',
            background: '#0a0a0a',
          }}
        >
          <div style={{ maxWidth: '28rem', width: '100%', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              应用发生严重错误
            </h2>
            <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>
              请尝试重试，或返回首页重新加载。
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={reset}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                重试
              </button>
              <button
                onClick={() => {
                  window.location.href = '/';
                }}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.75rem',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
