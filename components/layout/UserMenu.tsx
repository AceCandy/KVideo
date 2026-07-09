'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { User, Settings, Crown, Sun, Moon, LogOut } from 'lucide-react';
import { getSession, clearSession } from '@/lib/store/auth-store';
import { useTheme } from '@/components/ThemeProvider';

// 与 PremiumPasswordGate 共用的解锁态 key
const PREMIUM_UNLOCK_KEY = 'kvideo-premium-unlocked';

/**
 * 右上角用户入口与下拉菜单。
 * 登录态显示头像 + 昵称（+ 管理员徽章），未登录显示占位图标，保证两类用户都能进入设置 / 切换明暗。
 * 菜单项：设置、高级专区（仅已解锁 / 管理员可见）、切换明暗、退出登录（仅登录态）。
 */
export function UserMenu() {
    const [open, setOpen] = useState(false);
    const [session] = useState(() => getSession());
    // 挂载时读取高级专区解锁态；解锁发生在 /premium 页，回到本菜单重新挂载时即读到最新值
    const [premiumUnlocked] = useState(
        () => typeof window !== 'undefined' && window.sessionStorage.getItem(PREMIUM_UNLOCK_KEY) === 'true'
    );
    const ref = useRef<HTMLDivElement>(null);
    const { actualTheme, setTheme } = useTheme();

    const isAdmin = !!session && (session.role === 'admin' || session.role === 'super_admin');
    const canEnterPremium = premiumUnlocked || isAdmin;

    // 点击菜单外部关闭
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const handleLogout = () => {
        fetch('/api/auth/session', { method: 'DELETE' })
            .catch(() => {
                // Best effort only.
            })
            .finally(() => {
                clearSession();
                window.location.href = '/';
            });
    };

    const toggleTheme = () => {
        setTheme(actualTheme === 'dark' ? 'light' : 'dark');
        setOpen(false);
    };

    const goPremium = () => {
        setOpen(false);
        window.location.href = '/premium';
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                aria-label="用户菜单"
                aria-expanded={open}
                aria-haspopup="menu"
                className="flex items-center gap-1.5 pl-1.5 pr-2 sm:pr-2.5 py-1 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)] transition-all duration-200 cursor-pointer"
            >
                <div className="w-6 h-6 rounded-full bg-[var(--accent-color)]/10 flex items-center justify-center text-[var(--accent-color)] font-bold text-[11px] border border-[var(--glass-border)]">
                    {session ? session.name.charAt(0).toUpperCase() : <User size={14} />}
                </div>
                {session && (
                    <span className="hidden sm:block max-w-[80px] truncate text-xs">{session.name}</span>
                )}
                {session && isAdmin && (
                    <span className="hidden sm:block px-1 py-0.5 bg-[var(--accent-color)]/10 text-[var(--accent-color)] rounded text-[10px] font-medium">
                        {session.role === 'super_admin' ? '超管' : '管理'}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 w-44 z-[3000]">
                    <div className="bg-[var(--glass-bg)] backdrop-blur-xl border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-md)] py-1 overflow-hidden" role="menu">
                        <Link
                            href="/settings"
                            onClick={() => setOpen(false)}
                            role="menuitem"
                            className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--text-color)_8%,transparent)] transition-colors"
                        >
                            <Settings size={16} />
                            设置
                        </Link>
                        {canEnterPremium && (
                            <button
                                onClick={goPremium}
                                role="menuitem"
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-amber-400 hover:bg-amber-500/10 transition-colors"
                            >
                                <Crown size={16} />
                                高级专区
                            </button>
                        )}
                        <button
                            onClick={toggleTheme}
                            role="menuitem"
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--text-color)_8%,transparent)] transition-colors"
                        >
                            {actualTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                            {actualTheme === 'dark' ? '浅色模式' : '深色模式'}
                        </button>
                        {session && (
                            <button
                                onClick={handleLogout}
                                role="menuitem"
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                                <LogOut size={16} />
                                退出登录
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
