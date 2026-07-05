import React, { useCallback, RefObject } from 'react';
import { Icons } from '@/components/ui/Icon';

interface DesktopVolumeControlProps {
    volumeBarRef: RefObject<HTMLDivElement | null>;

    volume: number;
    isMuted: boolean;
    showVolumeBar: boolean;
    onToggleMute: () => void;
    onVolumeChange: (e: React.MouseEvent<HTMLDivElement>) => void;
    onVolumeMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    /** Absolute volume target (0..1) driven by keyboard interaction. */
    onVolumeByKey?: (volume: number) => void;
}

const KEY_VOLUME_STEP = 0.05;

export function DesktopVolumeControl({
    volumeBarRef,
    volume,
    isMuted,
    showVolumeBar,
    onToggleMute,
    onVolumeChange,
    onVolumeMouseDown,
    onVolumeByKey
}: DesktopVolumeControlProps) {
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!onVolumeByKey) return;
        const current = isMuted ? 0 : volume;
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowUp':
                e.preventDefault();
                onVolumeByKey(current + KEY_VOLUME_STEP);
                break;
            case 'ArrowLeft':
            case 'ArrowDown':
                e.preventDefault();
                onVolumeByKey(current - KEY_VOLUME_STEP);
                break;
            case 'Home':
                e.preventDefault();
                onVolumeByKey(0);
                break;
            case 'End':
                e.preventDefault();
                onVolumeByKey(1);
                break;
        }
    }, [onVolumeByKey, isMuted, volume]);

    const effectiveVolume = isMuted ? 0 : volume;
    const volumePct = effectiveVolume * 100;

    return (
        <div className="flex items-center gap-2 group/volume">
            <button
                onClick={onToggleMute}
                className="btn-icon"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
                {isMuted || volume === 0 ? (
                    <Icons.VolumeX size={20} />
                ) : volume < 0.5 ? (
                    <Icons.Volume1 size={20} />
                ) : (
                    <Icons.Volume2 size={20} />
                )}
            </button>

            {/* Volume Bar */}
            <div className={`flex items-center gap-2 overflow-hidden transition-all duration-300 ${showVolumeBar
                ? 'opacity-100 w-32'
                : 'opacity-0 w-0 group-hover/volume:opacity-100 group-hover/volume:w-32'
                }`}>
                <div
                    ref={volumeBarRef}
                    className="slider-track h-1 cursor-pointer flex-1"
                    role="slider"
                    // Only focusable when the bar is actually shown; a collapsed slider
                    // must not appear in the keyboard tab sequence.
                    tabIndex={showVolumeBar ? 0 : -1}
                    aria-label="音量"
                    aria-orientation="horizontal"
                    aria-valuemin={0}
                    aria-valuemax={1}
                    aria-valuenow={Math.round(effectiveVolume * 100) / 100}
                    aria-valuetext={`${Math.round(volumePct)}%`}
                    onClick={onVolumeChange}
                    onMouseDown={onVolumeMouseDown}
                    onKeyDown={handleKeyDown}
                >
                    <div
                        className="slider-range h-full"
                        style={{ width: `${volumePct}%` }}
                    />
                    <div
                        className="slider-thumb"
                        style={{ left: `${volumePct}%` }}
                    />
                </div>
                <span className="text-white text-xs font-medium tabular-nums min-w-[2rem]">
                    {Math.round(volumePct)}
                </span>
            </div>
        </div>
    );
}
