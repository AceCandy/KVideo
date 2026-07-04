'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { MouseEvent, RefObject } from 'react';
import Hls from 'hls.js';
import type { M3UChannel } from '@/lib/utils/m3u-parser';

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

export interface UseIptvHlsResult {
  error: string | null;
  isLoading: boolean;
  isLive: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  seekWindow: { start: number; end: number; duration: number } | null;
  volume: number;
  isMuted: boolean;
  reload: (url: string) => void;
  togglePlay: () => void;
  toggleMute: () => void;
  setVolumeLevel: (value: number) => void;
  seekTo: (e: MouseEvent<HTMLDivElement>) => void;
}

/**
 * useIptvHls — owns the IPTV playback state machine.
 *
 * Loads an HLS / native-HLS / direct-video stream into the given video element
 * via a three-route fallback chain (direct, or proxied when custom headers are
 * present -> proxy HLS -> direct video -> proxied direct video), filters HEVC
 * levels on manifest parse, and gates completion with a 30s loading timeout
 * whose `loadingResolved` flag makes `markLoaded` / `markError` idempotent.
 *
 * Also binds the video element's play / pause / timeupdate / durationchange /
 * volumechange events so all playback state has a single owner. The shell
 * passes the video + progress refs in and reads state + actions back.
 */
export function useIptvHls(
  videoRef: RefObject<HTMLVideoElement | null>,
  progressRef: RefObject<HTMLDivElement | null>,
  channel: M3UChannel
): UseIptvHlsResult {
  const hlsRef = useRef<Hls | null>(null);
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seekWindow, setSeekWindow] = useState<{ start: number; end: number; duration: number } | null>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

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

  const reload = useCallback((url: string) => {
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

  // Unmount cleanup: destroy hls + clear loading timeout
  useEffect(() => {
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
  }, []);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  }, []);

  const setVolumeLevel = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    if (value > 0 && video.muted) video.muted = false;
  }, []);

  const seekTo = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (isLive) return;
    const video = videoRef.current;
    const bar = progressRef.current;
    if (!video || !bar) return;
    const seekRange = getSeekRange(video);
    if (!seekRange) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = seekRange.start + ratio * seekRange.duration;
  }, [isLive]);

  return {
    error,
    isLoading,
    isLive,
    isPlaying,
    currentTime,
    duration,
    seekWindow,
    volume,
    isMuted,
    reload,
    togglePlay,
    toggleMute,
    setVolumeLevel,
    seekTo,
  };
}
