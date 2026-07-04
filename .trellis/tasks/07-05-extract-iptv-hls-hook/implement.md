# Implement: extract-iptv-hls-hook

## Ordered checklist

1. From `main`, cut `refactor/extract-iptv-hls-hook`.
2. Create `components/iptv/hooks/useIptvHls.ts`:
   - Move `HLS_LIVE_CONFIG`, `LOADING_TIMEOUT_MS`, `getProxiedUrl`, `getSeekRange` as module-private helpers. `filterHEVCLevels` stays nested inside `reload` exactly as today (it is defined inside `loadChannel`).
   - Implement `useIptvHls(videoRef, progressRef, channel)`:
     - state: `error` / `isLoading` / `isLive` / `isPlaying` / `currentTime` / `duration` / `seekWindow` / `volume` / `isMuted`;
     - refs: `hlsRef` / `loadingTimeoutRef`;
     - `reload = useCallback((url) => { ...loadChannel body verbatim... }, [channel.httpUserAgent, channel.httpReferrer])`;
     - video event binding `useEffect(() => {...}, [])` verbatim;
     - unmount cleanup `useEffect(() => () => { destroy hls; clear timeout }, [])`;
     - handlers: `togglePlay` / `toggleMute` / `setVolumeLevel` / `seekTo` (`seekTo` deps `[isLive]`);
     - return the result object.
3. Rewrite `IPTVPlayer.tsx`:
   - Drop the moved helpers, state, refs (`hlsRef` / `loadingTimeoutRef`), effects (video event binding), and handlers (`togglePlay` / `toggleMute` / `handleVolumeChange` / `handleSeek`).
   - Add `const videoRef = useRef<HTMLVideoElement>(null); const progressRef = useRef<HTMLDivElement>(null);` (kept in shell) and the `useIptvHls(...)` destructure.
   - Rename call sites: `loadChannel(currentUrl)` -> `reload(currentUrl)` (Error overlay retry + channel/route effect); `handleVolumeChange` -> `setVolumeLevel`; `handleSeek` -> `seekTo`.
   - Keep keyboard / seek-step / fullscreen / route-reset effects. The channel-route effect body becomes `reload(currentUrl)` with deps `[currentUrl, reload]` and no cleanup (reload cleans up internally; hook handles unmount).
4. `npx tsc --noEmit` -> 0 errors.
5. `npx next build` -> success.
6. `trellis-check`: independent review of 7 invariants; line-by-line diff of `reload` body vs pre-change `loadChannel`; verify keyboard effect still has no dep array; verify video event binding verbatim.
7. `trellis-update-spec`: record aggressive-scope hook extraction pattern + feature-local hook-location decision.
8. Commit; fast-forward merge to `main`; archive; push.

## Validation commands

```bash
npx tsc --noEmit
npx next build
git diff main -- components/iptv/IPTVChannelGrid.tsx   # must be empty
git show main:components/iptv/IPTVPlayer.tsx           # for line-by-line loadChannel diff
```

## Review gates

- tsc + build must pass before `trellis-check`.
- `trellis-check` must pass before spec update / commit.
- No Phase 3 step skipped (per `trellis-phase3-no-skip`).

## Rollback

Single feature branch. If check or build fails, discard; `main` is unaffected.
