'use client';

import { Icons } from '@/components/ui/Icon';
import type { TopBarProps } from './types';

/**
 * TopBar — top overlay of the IPTV player.
 *
 * Shows the LIVE badge, channel name, and route counter on the left, and the
 * close button on the right. Visibility fades with `showControls`. Purely
 * presentational; all state comes from the shell via props.
 */
export function TopBar({ showControls, isLive, channelName, routeIndex, routeCount, onClose }: TopBarProps) {
  return (
    <div
      data-controls
      className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/70 to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isLive && (
            <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              LIVE
            </span>
          )}
          <span className="text-white text-sm font-medium drop-shadow-lg">{channelName}</span>
          {routeCount > 1 && (
            <span className="text-white/50 text-xs">线路 {routeIndex + 1}/{routeCount}</span>
          )}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors cursor-pointer"
        >
          <Icons.X size={18} />
        </button>
      </div>
    </div>
  );
}
