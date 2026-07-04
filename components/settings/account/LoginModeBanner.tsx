'use client';

import { Info } from 'lucide-react';
import type { LoginMode } from './types';

interface LoginModeBannerProps {
  loginMode: LoginMode;
  isManagedMode: boolean;
}

export function LoginModeBanner({ loginMode, isManagedMode }: LoginModeBannerProps) {
  return (
    <div className="flex items-start gap-3 p-4 bg-[color-mix(in_srgb,var(--accent-color)_5%,transparent)] border border-[var(--glass-border)] rounded-[var(--radius-2xl)]">
      <Info className="text-[var(--text-color-secondary)] shrink-0 mt-0.5" size={16} />
      <div className="space-y-1">
        <p className="text-xs text-[var(--text-color-secondary)]">
          当前登录模式：
          <span className="text-[var(--text-color)] ml-1">
            {isManagedMode ? 'Redis 托管账户' : loginMode === 'legacy_password' ? '环境变量密码登录' : '未启用'}
          </span>
        </p>
        {isManagedMode ? (
          <p className="text-xs text-[var(--text-color-secondary)]">
            托管模式下由超级管理员直接在此页面管理账户，修改会立即写入服务端存储。
          </p>
        ) : (
          <p className="text-xs text-[var(--text-color-secondary)]">
            环境变量模式下可继续使用 <code className="px-1 py-0.5 bg-[var(--glass-bg)] rounded text-[10px]">ADMIN_PASSWORD</code> 与 <code className="px-1 py-0.5 bg-[var(--glass-bg)] rounded text-[10px]">ACCOUNTS</code> 配置访问控制。
          </p>
        )}
      </div>
    </div>
  );
}
