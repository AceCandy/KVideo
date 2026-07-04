import type { MouseEvent, RefObject } from 'react';

/**
 * Props contract for the IPTV top bar.
 *
 * Presentational overlay pinned to the top of the player. Receives the live
 * flag, channel name, and route counter from the shell; reports close requests
 * back. Visibility is gated by `showControls` so the shell owns auto-hide.
 */
export interface TopBarProps {
  showControls: boolean;
  isLive: boolean;
  channelName: string;
  routeIndex: number;
  routeCount: number;
  onClose: () => void;
}

/**
 * Props contract for the IPTV bottom control bar.
 *
 * Hosts the seek bar, play/pause, time display, route selector, volume control,
 * sidebar toggle, and fullscreen button. All playback state and the seek-bar
 * ref live in the shell; this component renders from props and reports user
 * intent via callbacks. The seek-bar ref is forwarded from the shell so its
 * seek handler can read the bounding box directly.
 */
export interface BottomControlsProps {
  // visibility
  showControls: boolean;
  // progress (non-live only)
  isLive: boolean;
  duration: number;
  currentTime: number;
  progressPercent: number;
  progressRef: RefObject<HTMLDivElement | null>;
  onSeek: (e: MouseEvent<HTMLDivElement>) => void;
  // play
  isPlaying: boolean;
  onTogglePlay: () => void;
  // routes
  routes: string[];
  currentRouteIndex: number;
  onRouteChange: (index: number) => void;
  showAllRoutes: boolean;
  onToggleShowAllRoutes: () => void;
  // volume
  volume: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  // sidebar toggle
  showSidebar: boolean;
  onToggleSidebar: () => void;
  // fullscreen
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}
