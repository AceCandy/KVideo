'use client';

import { useSyncExternalStore } from 'react';
import { Crown } from 'lucide-react';
import { getSession } from '@/lib/store/auth-store';

// 与 PremiumPasswordGate 共用的解锁态 key
const PREMIUM_UNLOCK_KEY = 'kvideo-premium-unlocked';

/**
 * 判断当前是否可进入高级专区：已通过密码解锁，或为管理员（可绕过密码）。
 * 仅在客户端读取，SSR 阶段返回 false 以避免 hydration 不匹配。
 */
function canSwitchPremium(): boolean {
    if (typeof window === 'undefined') return false;
    const unlocked = window.sessionStorage.getItem(PREMIUM_UNLOCK_KEY) === 'true';
    const session = getSession();
    const isAdmin = !!session && (session.role === 'admin' || session.role === 'super_admin');
    return unlocked || isAdmin;
}

const subscribe = () => () => {};

/**
 * 首页"高级专区"快捷入口。
 * 已解锁 / 管理员可点击跳转 /premium，否则灰显禁用。
 * 真正的密码门禁仍在 /premium 的 PremiumPasswordGate 中。
 */
export function PremiumSwitchButton() {
    const canSwitch = useSyncExternalStore(subscribe, canSwitchPremium, () => false);

    const handleClick = () => {
        window.location.href = '/premium';
    };

    return (
        <button
            onClick={handleClick}
            disabled={!canSwitch}
            title={canSwitch ? '进入高级专区' : '需先解锁高级内容'}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-bold transition-all duration-200 ${
                canSwitch
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25 hover:-translate-y-0.5 cursor-pointer'
                    : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color-secondary)] opacity-50 cursor-not-allowed'
            }`}
        >
            <Crown size={16} />
            高级专区
        </button>
    );
}
