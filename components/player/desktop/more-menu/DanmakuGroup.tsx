'use client';

import { Icons } from '@/components/ui/Icon';
import { ToggleSwitch } from './ToggleSwitch';
import { usePlayerSettings } from '../../hooks/usePlayerSettings';

interface DanmakuGroupProps {
    isPremium: boolean;
    isRotated: boolean;
}

export function DanmakuGroup({ isPremium, isRotated }: DanmakuGroupProps) {
    const {
        danmakuEnabled,
        setDanmakuEnabled,
        danmakuApiUrl,
        danmakuOpacity,
        setDanmakuOpacity,
        danmakuFontSize,
        setDanmakuFontSize,
        danmakuDisplayArea,
        setDanmakuDisplayArea,
    } = usePlayerSettings(isPremium);

    return (
        <>
            {/* Danmaku Toggle */}
            <div className={`${isRotated ? 'px-2 py-1.5' : 'px-3 py-2 sm:px-4 sm:py-2.5'} flex items-center justify-between gap-4`}>
                <div className={`flex items-center gap-2 ${!danmakuApiUrl ? 'text-[var(--text-color-secondary)]' : 'text-[var(--text-color)]'} ${isRotated ? 'text-[11px]' : 'text-xs sm:text-sm'}`}>
                    <Icons.Danmaku size={isRotated ? 14 : 16} className="sm:w-[18px] sm:h-[18px]" />
                    <span>弹幕</span>
                    {!danmakuApiUrl && (
                        <span className={`${isRotated ? 'text-[9px]' : 'text-[10px] sm:text-xs'} text-[var(--text-color-secondary)]`}>(未配置)</span>
                    )}
                </div>
                <ToggleSwitch
                    checked={danmakuEnabled}
                    onChange={() => setDanmakuEnabled(!danmakuEnabled)}
                    isRotated={isRotated}
                    disabled={!danmakuApiUrl}
                />
            </div>

            {/* Danmaku Sub-Settings (shown when enabled and configured) */}
            {danmakuEnabled && danmakuApiUrl && (
                <div className={`${isRotated ? 'px-2 pb-1.5' : 'px-3 pb-2 sm:px-4 sm:pb-2.5'} space-y-2.5`}>
                    {/* Opacity Slider */}
                    <div className={`${isRotated ? 'ml-4' : 'ml-6 sm:ml-7'}`}>
                        <div className={`flex items-center justify-between mb-1 ${isRotated ? 'text-[9px]' : 'text-[10px] sm:text-xs'} text-[var(--text-color-secondary)]`}>
                            <span>透明度</span>
                            <span>{Math.round(danmakuOpacity * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="100"
                            value={Math.round(danmakuOpacity * 100)}
                            onChange={(e) => setDanmakuOpacity(parseInt(e.target.value) / 100)}
                            className={`w-full accent-[var(--accent-color)] ${isRotated ? 'h-1' : 'h-1.5'}`}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>

                    {/* Font Size Buttons */}
                    <div className={`${isRotated ? 'ml-4' : 'ml-6 sm:ml-7'}`}>
                        <div className={`mb-1 ${isRotated ? 'text-[9px]' : 'text-[10px] sm:text-xs'} text-[var(--text-color-secondary)]`}>字号</div>
                        <div className="flex gap-1 flex-wrap">
                            {[14, 18, 20, 24, 28].map((size) => (
                                <button
                                    key={size}
                                    onClick={() => setDanmakuFontSize(size)}
                                    className={`rounded-[var(--radius-2xl)] border font-medium transition-all duration-200 cursor-pointer ${isRotated ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px] sm:text-xs'} ${danmakuFontSize === size
                                        ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white'
                                        : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                                        }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Display Area Buttons */}
                    <div className={`${isRotated ? 'ml-4' : 'ml-6 sm:ml-7'}`}>
                        <div className={`mb-1 ${isRotated ? 'text-[9px]' : 'text-[10px] sm:text-xs'} text-[var(--text-color-secondary)]`}>显示区域</div>
                        <div className="flex gap-1 flex-wrap">
                            {([
                                { value: 0.25, label: '1/4屏' },
                                { value: 0.5, label: '半屏' },
                                { value: 0.75, label: '3/4屏' },
                                { value: 1.0, label: '全屏' },
                            ] as const).map(({ value, label }) => (
                                <button
                                    key={value}
                                    onClick={() => setDanmakuDisplayArea(value)}
                                    className={`rounded-[var(--radius-2xl)] border font-medium transition-all duration-200 cursor-pointer ${isRotated ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px] sm:text-xs'} ${danmakuDisplayArea === value
                                        ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white'
                                        : 'bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-color)] hover:bg-[color-mix(in_srgb,var(--accent-color)_10%,transparent)]'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
