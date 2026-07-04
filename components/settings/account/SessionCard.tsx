'use client';

import { LogOut, Shield } from 'lucide-react';
import { logoutAndReload } from './utils';
import type { Session } from './types';

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  if (!session) return null;

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)]">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-[var(--radius-full)] bg-[var(--accent-color)]/10 flex items-center justify-center text-[var(--accent-color)] font-bold text-lg border border-[var(--glass-border)]">
          {session.name.charAt(0)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--text-color)] truncate">{session.name}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Shield size={12} className={session.role === 'super_admin' || session.role === 'admin' ? 'text-[var(--accent-color)]' : 'text-[var(--text-color-secondary)]'} />
            <span className="text-xs text-[var(--text-color-secondary)]">
              {session.role === 'super_admin' ? '超级管理员' : session.role === 'admin' ? '管理员' : '观众'}
            </span>
            {session.username && (
              <span className="text-xs text-[var(--text-color-secondary)]">
                @{session.username}
              </span>
            )}
            {session.mode && (
              <span className="text-xs text-[var(--text-color-secondary)]">
                {session.mode === 'managed' ? '托管账户模式' : '环境变量模式'}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={logoutAndReload}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-[var(--radius-full)] text-[var(--text-color-secondary)] hover:text-red-500 hover:border-red-500/30 transition-all duration-200 cursor-pointer"
      >
        <LogOut size={14} />
        退出登录
      </button>
    </div>
  );
}
