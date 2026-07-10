'use client';

/**
 * IPTVPlayer - Player shell for IPTV streams.
 *
 * Thin orchestrator: composes the `useIptvHls` playback-state-machine hook
 * with UI state (controls auto-hide, sidebar, route selector, fullscreen,
 * seek-step), keyboard shortcuts, and the sidebar + control-bar subcomponents.
 * All playback state and the HLS lifecycle live in the hook.
 */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { M3UChannel } from '@/lib/utils/m3u-parser';
import type { IPTVSource } from '@/lib/store/iptv-store';
import { settingsStore, DEFAULT_SEEK_STEP_SECONDS } from '@/lib/store/settings-store';
import { shouldHidePlayerCursor } from '@/lib/player/cursor-visibility';
import { ChannelSidebar } from './iptv-sidebar/ChannelSidebar';
import { TopBar } from './iptv-controls/TopBar';
import { BottomControls } from './iptv-controls/BottomControls';
import { useIptvHls } from './hooks/useIptvHls';

interface IPTVPlayerProps {
  channel: M3UChannel;
  onClose: () => void;
  channels: M3UChannel[];
  onChannelChange: (channel: M3UChannel) => void;
  channelsBySource?: Record<string, { channels: M3UChannel[]; groups: string[] }>;
  sources?: IPTVSource[];
}

export function IPTVPlayer({ channel, onClose, channels, onChannelChange, channelsBySource, sources }: IPTVPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [showSidebar, setShowSidebar] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [seekStepSeconds, setSeekStepSeconds] = useState(DEFAULT_SEEK_STEP_SECONDS);

  const {
    error, isLoading, isLive, isPlaying, currentTime, duration,
    seekWindow, volume, isMuted, reload, togglePlay, toggleMute,
    setVolumeLevel, seekTo,
  } = useIptvHls(videoRef, progressRef, channel);

  // Get current route URL
  const routes = channel.routes || [channel.url];
  const currentUrl = routes[currentRouteIndex] || channel.url;

  useEffect(() => {
    const syncSeekStep = () => {
      setSeekStepSeconds(settingsStore.getSettings().seekStepSeconds ?? DEFAULT_SEEK_STEP_SECONDS);
    };

    syncSeekStep();
    const unsubscribe = settingsStore.subscribe(syncSeekStep);
    return () => unsubscribe();
  }, []);

  // Track fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Controls auto-hide
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  // Load on channel/route change
  useEffect(() => {
    reload(currentUrl);
  }, [currentUrl, reload]);

  // Reset route index when the channel changes. Adjust during render (not in an
  // effect) so React Compiler can keep optimizing the shell.
  const channelKey = channel.name + '|' + channel.url;
  const [prevChannelKey, setPrevChannelKey] = useState(channelKey);
  if (channelKey !== prevChannelKey) {
    setPrevChannelKey(channelKey);
    setCurrentRouteIndex(0);
    setShowAllRoutes(false);
  }

  const progressPercent = useMemo(() => {
    if (seekWindow) {
      return Math.max(0, Math.min(100, ((currentTime - seekWindow.start) / seekWindow.duration) * 100));
    }
    if (!duration) return 0;
    return Math.max(0, Math.min(100, (currentTime / duration) * 100));
  }, [currentTime, duration, seekWindow]);

  const shouldHideCursor = shouldHidePlayerCursor({
    isFullscreen,
    isPlaying,
    showControls,
    hasInteractiveOverlay: showSidebar || Boolean(error),
  });

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await containerRef.current.requestFullscreen();
    }
  };

  // Keyboard shortcuts (matching main video player)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      resetControlsTimeout();
      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'escape':
          e.preventDefault();
          onClose();
          break;
        case 'arrowright':
        case 'l':
          e.preventDefault();
          if (!isLive && isFinite(video.duration)) {
            video.currentTime = Math.min(video.duration, video.currentTime + seekStepSeconds);
          }
          break;
        case 'arrowleft':
        case 'j':
          e.preventDefault();
          if (!isLive && isFinite(video.duration)) {
            video.currentTime = Math.max(0, video.currentTime - seekStepSeconds);
          }
          break;
        case 'arrowup':
          e.preventDefault();
          video.volume = Math.min(1, video.volume + 0.1);
          if (video.muted) video.muted = false;
          break;
        case 'arrowdown':
          e.preventDefault();
          video.volume = Math.max(0, video.volume - 0.1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[var(--z-modal)] bg-black flex"
      style={{ cursor: shouldHideCursor ? 'none' : undefined }}
      onMouseMove={resetControlsTimeout}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('[data-controls]') || (e.target as HTMLElement).closest('[data-sidebar]')) return;
        togglePlay();
        resetControlsTimeout();
      }}
    >
      {/* Player Area */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          playsInline
          autoPlay
        />

        {/* Loading */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <p className="text-white/70 text-sm">加载中...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center" data-controls>
              <p className="text-red-400 text-sm mb-3">{error}</p>
              <div className="flex gap-2 flex-wrap justify-center">
                <button
                  onClick={(e) => { e.stopPropagation(); reload(currentUrl); }}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors cursor-pointer"
                >
                  重试
                </button>
                {routes.length > 1 && currentRouteIndex < routes.length - 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setCurrentRouteIndex(prev => prev + 1); }}
                    className="px-4 py-2 bg-blue-600/80 hover:bg-blue-600 rounded-lg text-white text-sm transition-colors cursor-pointer"
                  >
                    切换线路
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <TopBar
          showControls={showControls}
          isLive={isLive}
          channelName={channel.name}
          routeIndex={currentRouteIndex}
          routeCount={routes.length}
          onClose={onClose}
        />

        <BottomControls
          showControls={showControls}
          isLive={isLive}
          duration={duration}
          currentTime={currentTime}
          progressPercent={progressPercent}
          progressRef={progressRef}
          onSeek={seekTo}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          routes={routes}
          currentRouteIndex={currentRouteIndex}
          onRouteChange={setCurrentRouteIndex}
          showAllRoutes={showAllRoutes}
          onToggleShowAllRoutes={() => setShowAllRoutes(!showAllRoutes)}
          volume={volume}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onVolumeChange={setVolumeLevel}
          showSidebar={showSidebar}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <ChannelSidebar
          channel={channel}
          channels={channels}
          channelsBySource={channelsBySource}
          sources={sources}
          onChannelChange={onChannelChange}
          onClose={() => setShowSidebar(false)}
        />
      )}
    </div>
  );
}
