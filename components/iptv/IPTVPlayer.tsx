'use client';

/**
 * IPTVPlayer - Player for IPTV streams with controls, volume, progress, and sidebar.
 * Supports HLS (via HLS.js), native HLS (Safari), and direct video playback.
 * Features multi-level sidebar (source -> group -> channels), multi-route collapse,
 * and optimized search performance.
 */

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Hls from 'hls.js';
import type { M3UChannel } from '@/lib/utils/m3u-parser';
import type { IPTVSource } from '@/lib/store/iptv-store';
import { settingsStore, DEFAULT_SEEK_STEP_SECONDS } from '@/lib/store/settings-store';
import { ChannelSidebar } from './iptv-sidebar/ChannelSidebar';
import { TopBar } from './iptv-controls/TopBar';
import { BottomControls } from './iptv-controls/BottomControls';

const HLS_LIVE_CONFIG: Partial<Hls['config']> = {
  enableWorker: true,
  lowLatencyMode: true,
  liveDurationInfinity: true,
  manifestLoadingTimeOut: 10000,
  manifestLoadingMaxRetry: 3,
  levelLoadingTimeOut: 10000,
  fragLoadingTimeOut: 20000,
  // Prefer H.264 (avc) over HEVC (hev/hvc) for maximum browser compatibility
  preferManagedMediaSource: false,
};

const LOADING_TIMEOUT_MS = 30000;

interface IPTVPlayerProps {
  channel: M3UChannel;
  onClose: () => void;
  channels: M3UChannel[];
  onChannelChange: (channel: M3UChannel) => void;
  channelsBySource?: Record<string, { channels: M3UChannel[]; groups: string[] }>;
  sources?: IPTVSource[];
}

function getProxiedUrl(url: string, ua?: string, referer?: string): string {
  let proxyUrl = `/api/iptv/stream?`;
  if (ua) proxyUrl += `ua=${encodeURIComponent(ua)}&`;
  if (referer) proxyUrl += `referer=${encodeURIComponent(referer)}&`;
  proxyUrl += `url=${encodeURIComponent(url)}`;
  return proxyUrl;
}

function getSeekRange(video: HTMLVideoElement): { start: number; end: number; duration: number } | null {
  if (video.seekable.length > 0) {
    const start = video.seekable.start(0);
    const end = video.seekable.end(video.seekable.length - 1);
    if (isFinite(start) && isFinite(end) && end > start) {
      return { start, end, duration: end - start };
    }
  }

  if (isFinite(video.duration) && video.duration > 0) {
    return { start: 0, end: video.duration, duration: video.duration };
  }

  return null;
}

export function IPTVPlayer({ channel, onClose, channels, onChannelChange, channelsBySource, sources }: IPTVPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [error, setError] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekWindow, setSeekWindow] = useState<{ start: number; end: number; duration: number } | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentRouteIndex, setCurrentRouteIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAllRoutes, setShowAllRoutes] = useState(false);
  const [seekStepSeconds, setSeekStepSeconds] = useState(DEFAULT_SEEK_STEP_SECONDS);

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

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      const range = getSeekRange(video);
      setCurrentTime(video.currentTime);
      setSeekWindow(range);
      if (range) {
        setDuration(range.duration);
        setIsLive(false);
      } else {
        const dur = video.duration;
        if (isFinite(dur) && dur > 0) {
          setDuration(dur);
        }
        setIsLive(true);
      }
    };
    const onDurationChange = () => {
      const range = getSeekRange(video);
      setSeekWindow(range);
      if (range) {
        setDuration(range.duration);
        setIsLive(false);
      } else {
        const dur = video.duration;
        if (isFinite(dur) && dur > 0) {
          setDuration(dur);
        }
      }
    };
    const onVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('volumechange', onVolumeChange);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('volumechange', onVolumeChange);
    };
  }, []);

  const loadChannel = useCallback((url: string) => {
    const video = videoRef.current;
    if (!video) return;

    setError(null);
    setIsLoading(true);
    setIsLive(true);
    setCurrentTime(0);
    setDuration(0);
    setSeekWindow(null);

    // Clean up previous
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = undefined;
    }
    video.removeAttribute('src');
    video.load();

    const proxiedUrl = getProxiedUrl(url, channel.httpUserAgent, channel.httpReferrer);
    const hasCustomHeaders = !!(channel.httpUserAgent || channel.httpReferrer);
    // When custom headers are needed, skip direct attempt (browsers cannot set
    // User-Agent on XHR/fetch). Always go through our proxy which can forward
    // the headers server-side. This fixes audio-only issues on CCTV and similar.
    const initialUrl = hasCustomHeaders ? proxiedUrl : url;

    // Global loading timeout
    let loadingResolved = false;
    const markLoaded = () => {
      if (loadingResolved) return;
      loadingResolved = true;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = undefined;
      }
      setIsLoading(false);
    };
    const markError = (msg: string) => {
      if (loadingResolved) return;
      loadingResolved = true;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = undefined;
      }
      setIsLoading(false);
      setError(msg);
    };

    loadingTimeoutRef.current = setTimeout(() => {
      markError('加载超时，请尝试其他线路或频道');
    }, LOADING_TIMEOUT_MS);

    if (Hls.isSupported()) {
      const hls = new Hls(HLS_LIVE_CONFIG);
      hlsRef.current = hls;

      let triedProxy = false;
      let triedDirect = false;

      const tryDirectVideo = (directUrl: string) => {
        if (triedDirect) {
          markError('播放错误，请尝试其他线路或频道');
          return;
        }
        triedDirect = true;
        const vid = videoRef.current;
        if (!vid) return;
        vid.src = directUrl;
        vid.addEventListener('canplay', () => {
          markLoaded();
          vid.play().catch(() => {});
        }, { once: true });
        vid.addEventListener('error', () => {
          if (directUrl === url) {
            // Try proxied direct video
            const vid2 = videoRef.current;
            if (!vid2) return;
            vid2.src = proxiedUrl;
            vid2.addEventListener('canplay', () => {
              markLoaded();
              vid2.play().catch(() => {});
            }, { once: true });
            vid2.addEventListener('error', () => {
              markError('播放错误，请尝试其他线路或频道');
            }, { once: true });
          } else {
            markError('播放错误，请尝试其他线路或频道');
          }
        }, { once: true });
      };

      const tryWithProxy = () => {
        if (triedProxy) {
          tryDirectVideo(url);
          return;
        }
        triedProxy = true;
        hls.destroy();
        const hlsProxy = new Hls(HLS_LIVE_CONFIG);
        hlsRef.current = hlsProxy;
        hlsProxy.loadSource(proxiedUrl);
        hlsProxy.attachMedia(video);

        // Filter HEVC levels for proxy attempt too
        hlsProxy.on(Hls.Events.MANIFEST_PARSED, () => {
          filterHEVCLevels(hlsProxy);
          markLoaded();
          video.play().catch(() => {});
        });
        hlsProxy.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              hlsProxy.recoverMediaError();
            } else {
              hlsProxy.destroy();
              hlsRef.current = null;
              tryDirectVideo(url);
            }
          }
        });
      };

      // Helper: Filter out HEVC levels that browser may not support (fixes audio-only issue)
      const filterHEVCLevels = (hlsInstance: Hls) => {
        if (!hlsInstance.levels || hlsInstance.levels.length <= 1) return;
        const h264Levels = hlsInstance.levels
          .map((level, index) => ({ level, index }))
          .filter(({ level }) => {
            const codec = level.videoCodec?.toLowerCase() || '';
            // Keep levels without HEVC codec (H.264 or unknown)
            return !codec.includes('hev') && !codec.includes('h265') && !codec.includes('hvc');
          });
        // If we have H.264 levels, restrict to those
        if (h264Levels.length > 0 && h264Levels.length < hlsInstance.levels.length) {
          console.info('[IPTV] Filtering HEVC levels, using H.264 only for compatibility');
          // Set level to first H.264 level
          hlsInstance.currentLevel = h264Levels[0].index;
        }
      };

      // First try initial URL (direct or proxied based on custom headers)
      hls.loadSource(initialUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Filter HEVC levels to prevent audio-only playback
        filterHEVCLevels(hls);
        markLoaded();
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            tryWithProxy();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            tryWithProxy();
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS (Safari/iOS)
      video.src = initialUrl;
      video.addEventListener('canplay', () => {
        markLoaded();
        video.play().catch(() => {});
      }, { once: true });
      video.addEventListener('error', () => {
        // If direct failed, try proxy; if already proxied, fail
        if (initialUrl === proxiedUrl) {
          markError('播放错误');
          return;
        }
        video.src = proxiedUrl;
        video.addEventListener('canplay', () => {
          markLoaded();
          video.play().catch(() => {});
        }, { once: true });
        video.addEventListener('error', () => {
          markError('播放错误');
        }, { once: true });
      }, { once: true });
    } else {
      // Direct video fallback
      video.src = initialUrl;
      video.addEventListener('canplay', () => {
        markLoaded();
        video.play().catch(() => {});
      }, { once: true });
      video.addEventListener('error', () => {
        if (initialUrl === proxiedUrl) {
          markError('播放错误，请尝试其他频道');
          return;
        }
        video.src = proxiedUrl;
        video.addEventListener('canplay', () => {
          markLoaded();
          video.play().catch(() => {});
        }, { once: true });
        video.addEventListener('error', () => {
          markError('播放错误，请尝试其他频道');
        }, { once: true });
      }, { once: true });
    }
  }, [channel.httpUserAgent, channel.httpReferrer]);

  // Load on channel/route change
  useEffect(() => {
    loadChannel(currentUrl);
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = undefined;
      }
    };
  }, [currentUrl, loadChannel]);

  // Reset route index when channel changes
  useEffect(() => {
    setCurrentRouteIndex(0);
    setShowAllRoutes(false);
  }, [channel.name, channel.url]);

  // Playback controls
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const handleVolumeChange = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    if (value > 0 && video.muted) video.muted = false;
  };

  const progressRef = useRef<HTMLDivElement>(null);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLive) return;
    const video = videoRef.current;
    const bar = progressRef.current;
    if (!video || !bar) return;
    const seekRange = getSeekRange(video);
    if (!seekRange) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = seekRange.start + ratio * seekRange.duration;
  };

  const progressPercent = useMemo(() => {
    if (seekWindow) {
      return Math.max(0, Math.min(100, ((currentTime - seekWindow.start) / seekWindow.duration) * 100));
    }
    if (!duration) return 0;
    return Math.max(0, Math.min(100, (currentTime / duration) * 100));
  }, [currentTime, duration, seekWindow]);

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
      className="fixed inset-0 z-[9999] bg-black flex"
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
                  onClick={(e) => { e.stopPropagation(); loadChannel(currentUrl); }}
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
          onSeek={handleSeek}
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
          onVolumeChange={handleVolumeChange}
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
