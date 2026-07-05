import React, { useCallback, RefObject } from 'react';

interface DesktopProgressBarProps {
    progressBarRef: RefObject<HTMLDivElement | null>;

    currentTime: number;
    duration: number;
    bufferedTime: number;
    onProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void;
    onProgressMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
    onProgressTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
    /** Absolute seek target (seconds) driven by keyboard interaction. */
    onSeekByKey?: (seconds: number) => void;
    formatTime?: (seconds: number) => string;
}

const KEY_SEEK_STEP = 5;

export function DesktopProgressBar({
    progressBarRef,
    currentTime,
    duration,
    bufferedTime,
    onProgressClick,
    onProgressMouseDown,
    onProgressTouchStart,
    onSeekByKey,
    formatTime
}: DesktopProgressBarProps) {
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (!onSeekByKey) return;
        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowUp':
                e.preventDefault();
                onSeekByKey(currentTime + KEY_SEEK_STEP);
                break;
            case 'ArrowLeft':
            case 'ArrowDown':
                e.preventDefault();
                onSeekByKey(currentTime - KEY_SEEK_STEP);
                break;
            case 'Home':
                e.preventDefault();
                onSeekByKey(0);
                break;
            case 'End':
                e.preventDefault();
                onSeekByKey(duration);
                break;
        }
    }, [onSeekByKey, currentTime, duration]);

    const safeDuration = duration > 0 ? duration : 0;
    const pct = safeDuration > 0 ? (currentTime / safeDuration) * 100 : 0;

    return (
        <div className="px-4 pb-1">
            <div
                ref={progressBarRef}
                className="slider-track cursor-pointer"
                role="slider"
                tabIndex={0}
                aria-label="播放进度"
                aria-orientation="horizontal"
                aria-valuemin={0}
                aria-valuemax={Math.floor(safeDuration)}
                aria-valuenow={Math.floor(currentTime)}
                aria-valuetext={formatTime ? `${formatTime(currentTime)} / ${formatTime(safeDuration)}` : undefined}
                onClick={onProgressClick}
                onMouseDown={onProgressMouseDown}
                onTouchStart={onProgressTouchStart}
                onKeyDown={handleKeyDown}
                style={{ pointerEvents: 'auto' }}
            >
                <div
                    className="slider-buffer"
                    style={{ width: `${(bufferedTime / safeDuration) * 100 || 0}%` }}
                />
                <div
                    className="slider-range"
                    style={{ width: `${pct}%` }}
                />
                <div
                    className="slider-thumb"
                    style={{ left: `${pct}%` }}
                />
            </div>
        </div>
    );
}
