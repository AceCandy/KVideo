'use client';

import { useState } from 'react';
import { Icons } from '@/components/ui/Icon';
import { usePlayerSettings } from '../../hooks/usePlayerSettings';
import { type AdFilterMode } from '@/lib/store/settings-store';

const AD_FILTER_LABELS: Record<string, string> = {
    off: '关闭',
    keyword: '关键词',
    heuristic: '智能(Beta)',
    aggressive: '激进'
};

interface AdFilterGroupProps {
    isPremium: boolean;
}

export function AdFilterGroup({ isPremium }: AdFilterGroupProps) {
    const { adFilterMode, setAdFilterMode } = usePlayerSettings(isPremium);
    const [isAdFilterOpen, setAdFilterOpen] = useState(false);

    return (
        <div className="px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-[var(--text-color)]">
                <Icons.ShieldAlert size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span>广告过滤</span>
            </div>
            {/* Custom Ad Filter Mode Selector */}
            <div className="relative">
                <button
                    onClick={() => setAdFilterOpen(!isAdFilterOpen)}
                    className="flex items-center gap-1 sm:gap-1.5 bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-color)] text-[10px] sm:text-xs rounded-[var(--radius-2xl)] px-2 sm:px-2.5 py-1 sm:py-1.5 outline-none hover:border-[var(--accent-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_5%,transparent)] transition-all cursor-pointer whitespace-nowrap"
                >
                    <span>{AD_FILTER_LABELS[adFilterMode] || '关闭'}</span>
                    <Icons.ChevronDown size={12} className={`text-[var(--text-color-secondary)] transition-transform duration-300 ${isAdFilterOpen ? 'rotate-180' : ''}`} />
                </button>

                {isAdFilterOpen && (
                    <>
                        <div className="fixed inset-0 z-10 cursor-default" onClick={() => setAdFilterOpen(false)} />
                        <div className="absolute right-0 top-full mt-2 w-28 sm:w-32 bg-[var(--glass-bg)] backdrop-blur-[25px] saturate-[180%] border border-[var(--glass-border)] rounded-[var(--radius-2xl)] shadow-[var(--shadow-md)] p-1 overflow-hidden z-20 flex flex-col animate-in fade-in zoom-in-95 duration-200">
                            {Object.entries(AD_FILTER_LABELS).map(([mode, label]) => (
                                <button
                                    key={mode}
                                    onClick={() => {
                                        setAdFilterMode(mode as AdFilterMode);
                                        setAdFilterOpen(false);
                                    }}
                                    className={`text-left text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-[var(--radius-2xl)] hover:bg-[color-mix(in_srgb,var(--accent-color)_15%,transparent)] transition-colors w-full flex items-center justify-between group ${adFilterMode === mode ? 'text-[var(--accent-color)] font-medium bg-[color-mix(in_srgb,var(--accent-color)_5%,transparent)]' : 'text-[var(--text-color)]'
                                        }`}
                                >
                                    <span>{label}</span>
                                    {adFilterMode === mode && <Icons.Check size={10} className="sm:w-[12px] sm:h-[12px] text-[var(--accent-color)]" />}
                                </button>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
