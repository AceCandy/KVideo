'use client';

import { useState } from 'react';
import { Icons } from '@/components/ui/Icon';
import type { BottomControlsProps } from './types';

const MAX_VISIBLE_ROUTES = 3;

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * BottomControls — bottom control bar of the IPTV player.
 *
 * Hosts the seek bar (non-live), play/pause, time display, route selector,
 * volume control, sidebar toggle, and fullscreen button. Presentational except
 * for the local volume-hover slider visibility, which never crosses the shell
 * boundary. The seek-bar ref is forwarded from the shell so its seek handler
 * can read the bounding box directly.
 */
export function BottomControls({
  showControls,
  isLive,
  duration,
  currentTime,
  progressPercent,
  progressRef,
  onSeek,
  isPlaying,
  onTogglePlay,
  routes,
  currentRouteIndex,
  onRouteChange,
  showAllRoutes,
  onToggleShowAllRoutes,
  volume,
  isMuted,
  onToggleMute,
  onVolumeChange,
  showSidebar,
  onToggleSidebar,
  isFullscreen,
  onToggleFullscreen,
}: BottomControlsProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const VolumeIcon = isMuted || volume === 0 ? Icons.VolumeX : volume < 0.5 ? Icons.Volume1 : Icons.Volume2;

  const visibleRoutes = showAllRoutes ? routes : routes.slice(0, MAX_VISIBLE_ROUTES);
  const hasMoreRoutes = routes.length > MAX_VISIBLE_ROUTES;

  return (
    <div
      data-controls
      className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {/* Progress Bar (non-live only) */}
      {!isLive && duration > 0 && (
        <div className="px-4 pt-2">
          <div
            ref={progressRef}
            className="group h-1 hover:h-2 bg-white/20 rounded-full cursor-pointer transition-all relative"
            onClick={(e) => { e.stopPropagation(); onSeek(e); }}
          >
            <div
              className="h-full bg-[var(--accent-color)] rounded-full relative pointer-events-none"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Play/Pause */}
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
        >
          {isPlaying ? <Icons.Pause size={20} /> : <Icons.Play size={20} />}
        </button>

        {/* Time Display */}
        {!isLive && duration > 0 && (
          <span className="text-white/70 text-xs tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        )}

        <div className="flex-1" />

        {/* Route Selector - collapsed */}
        {routes.length > 1 && (
          <div className="flex gap-1 items-center" data-controls>
            {visibleRoutes.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); onRouteChange(i); }}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors cursor-pointer ${
                  i === currentRouteIndex
                    ? 'bg-[var(--accent-color)] text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                线路{i + 1}
              </button>
            ))}
            {hasMoreRoutes && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggleShowAllRoutes(); }}
                className="px-2 py-0.5 text-[10px] rounded bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60 transition-colors cursor-pointer"
              >
                {showAllRoutes ? '收起' : `+${routes.length - MAX_VISIBLE_ROUTES}`}
              </button>
            )}
          </div>
        )}

        {/* Volume */}
        <div
          className="relative flex items-center"
          onMouseEnter={() => setShowVolumeSlider(true)}
          onMouseLeave={() => setShowVolumeSlider(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
          >
            <VolumeIcon size={18} />
          </button>
          {showVolumeSlider && (
            <div className="ml-1 w-20 flex items-center" data-controls>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => { e.stopPropagation(); onVolumeChange(parseFloat(e.target.value)); }}
                onClick={(e) => e.stopPropagation()}
                className="w-full h-1 accent-white cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Channel List */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSidebar(); }}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
        >
          <Icons.List size={18} />
        </button>

        {/* Fullscreen */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFullscreen(); }}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
        >
          {isFullscreen ? <Icons.Minimize size={18} /> : <Icons.Maximize size={18} />}
        </button>
      </div>
    </div>
  );
}
