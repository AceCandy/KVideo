# Design: extract-iptv-hls-hook

## Decision (user-approved)

Aggressive scope: the hook owns the full playback state machine — `loadChannel` + HLS lifecycle + video event binding + all playback state. The shell keeps only UI state + keyboard + fullscreen + route/seek-step orchestration. This resolves the parent-design ambiguity where `isLive` was specified in the hook's return shape but is also continuously written by the in-shell video event handler — by moving the video event handler into the hook, `isLive` has a single owner.

Hook location: `components/iptv/hooks/useIptvHls.ts` (feature-local, matching the `components/player/hooks/` convention). This deviates from the parent design's `lib/hooks/` suggestion; rationale: the hook is IPTV-specific (consumes `M3UChannel`, knows proxy URL rules, HEVC filtering) and would pollute the cross-cutting `lib/hooks/` directory.

## Hook interface

```ts
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

export function useIptvHls(
  videoRef: RefObject<HTMLVideoElement | null>,
  progressRef: RefObject<HTMLDivElement | null>,
  channel: M3UChannel
): UseIptvHlsResult;
```

`setVolumeLevel` is the former `handleVolumeChange` (renamed to avoid clashing with the internal `volume` state's setter). `seekTo` is the former `handleSeek`.

## Ownership table

| Owns hook | Stays in shell |
|---|---|
| Playback state: `error`, `isLoading`, `isLive`, `isPlaying`, `currentTime`, `duration`, `seekWindow`, `volume`, `isMuted` | UI state: `showControls`, `showSidebar`, `showAllRoutes`, `currentRouteIndex`, `isFullscreen`, `seekStepSeconds` |
| `hlsRef`, `loadingTimeoutRef` | `videoRef`, `progressRef` (created in shell, passed into hook), `containerRef`, `controlsTimeoutRef` |
| `loadChannel` (renamed `reload`) + HLS fallback chain + nested `filterHEVCLevels` + `tryDirectVideo` / `tryWithProxy` | `resetControlsTimeout`, `toggleFullscreen` |
| Video event binding effect (play/pause/timeupdate/durationchange/volumechange) | seek-step sync effect, fullscreenchange effect, route-reset effect, keyboard effect, channel/route -> `reload` effect |
| Module helpers: `HLS_LIVE_CONFIG`, `LOADING_TIMEOUT_MS`, `getProxiedUrl`, `getSeekRange` | `routes` / `currentUrl` derivation, `progressPercent` useMemo |
| Unmount cleanup (destroy hls, clear timeout) | |

## Effect equivalence

- **Video event binding** (`useEffect(() => {...bind...}, [])`): moves verbatim into the hook; still binds on mount only. Handlers read `videoRef.current` and write hook-local state — identical behavior.
- **`loadChannel`** becomes `reload`, a `useCallback` with deps `[channel.httpUserAgent, channel.httpReferrer]` — same as today. Body moves verbatim including the `triedProxy` / `triedDirect` / `loadingResolved` flags and the entire fallback chain (initial -> proxy HLS -> direct -> proxied direct, with `filterHEVCLevels` on `MANIFEST_PARSED`).
- **Channel/route effect**: shell keeps `useEffect(() => { reload(currentUrl); }, [currentUrl, reload])`. The original effect's cleanup (destroy hls, clear timeout) becomes redundant — `reload` itself cleans up at the top of its body (today's lines 202-211), and the hook adds an unmount-only cleanup. `Hls.destroy()` is idempotent, so the double-cleanup is safe.
- **Keyboard effect**: stays in shell, still has **no dependency array** (re-binds every render), so it reads fresh `isLive` / `seekStepSeconds` / `reload` / `togglePlay` / `toggleMute` each render. Arrow keys use `videoRef.current` directly (shell still owns `videoRef`); space/k/m call hook methods.
- **Unmount cleanup**: hook adds `useEffect(() => () => { destroy hls; clear loading timeout }, [])`.

## Shell call shape

```ts
const videoRef = useRef<HTMLVideoElement>(null);
const progressRef = useRef<HTMLDivElement>(null);
const {
  error, isLoading, isLive, isPlaying, currentTime, duration,
  seekWindow, volume, isMuted, reload, togglePlay, toggleMute,
  setVolumeLevel, seekTo,
} = useIptvHls(videoRef, progressRef, channel);
```

Destructuring keeps JSX identifiers (`isLive`, `isPlaying`, `currentTime`, `duration`, `volume`, `isMuted`) unchanged — only `handleVolumeChange` -> `setVolumeLevel`, `handleSeek` -> `seekTo`, `loadChannel` -> `reload` rename at the call sites (BottomControls props + Error overlay retry + channel/route effect).

## Invariants

1. HLS fallback order preserved verbatim: direct (or proxied when custom headers) -> proxy HLS -> direct video -> proxied direct video, HEVC levels filtered on `MANIFEST_PARSED` for both initial and proxy attempts.
2. Custom-header channels skip the direct attempt and go through the proxy on first try (`initialUrl` logic, today's lines 213-218).
3. Loading timeout (30s) fires `markError('加载超时...')` exactly once; `markLoaded` / `markError` idempotent via `loadingResolved`.
4. Video event binding + all five handlers (`onPlay` / `onPause` / `onTimeUpdate` / `onDurationChange` / `onVolumeChange`) verbatim, including the `getSeekRange`-based live detection.
5. Keyboard bindings + key set unchanged; keyboard effect still re-binds every render (no dep array).
6. `<IPTVPlayer>` public prop surface (5 props) unchanged; `IPTVChannelGrid.tsx` zero diff.
7. Visuals byte-identical: no JSX/className change — the diff is purely state-source swap + three call-site renames.

## Risk & mitigation

| Risk | Mitigation |
|---|---|
| `loadChannel` body mis-moved (closure flags dropped, fallback branch reordered) | Move the entire body verbatim; trellis-check diffs the hook against today's `loadChannel` line-by-line |
| `reload` dep array drift causes re-load storms | Keep `useCallback` deps exactly `[channel.httpUserAgent, channel.httpReferrer]`, matching today |
| Keyboard closure goes stale on `isLive` / `seekStepSeconds` change | Keyboard effect keeps no dep array (re-binds every render) — same as today |
| Channel/route effect cleanup double-destroying hls | `Hls.destroy()` is idempotent; `reload` top-of-body cleanup + hook unmount cleanup are both safe |
| `progressRef` attach timing across boundary | Created in shell, passed to hook + BottomControls; `seekTo` reads `progressRef.current` from inside the hook — same object |
| Accidental change to proxy URL rules / HEVC filter / loading timeout | All flagged in parent non-goals; trellis-check verifies byte-equality of those blocks |
