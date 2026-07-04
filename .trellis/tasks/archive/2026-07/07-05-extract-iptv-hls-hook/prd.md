# Extract IPTV HLS lifecycle into a hook

## Background

After C2.2 (`split-iptv-controls`, commit `2ded436`) the shell is 619 lines. The largest remaining coupling is `loadChannel` (190-398): it closes over `videoRef` / `hlsRef` / `loadingTimeoutRef`, six state setters, the channel's custom headers, and a nested three-route HLS fallback chain with HEVC filtering. The video event binding effect (136-188) is a second coupling cluster, writing `isPlaying` / `currentTime` / `duration` / `seekWindow` / `isLive` / `volume` / `isMuted`.

## Goal

Extract `loadChannel` + HLS lifecycle + video event binding + all playback state into a single `useIptvHls` hook under `components/iptv/hooks/`. The shell becomes a thin orchestrator: UI state + keyboard + fullscreen + route/seek-step effects. Runtime behavior byte-identical, visuals byte-identical.

## Decision (user-approved, aggressive scope)

The hook owns the full playback state machine (including `isLive`), and the video event handler moves with it. This resolves the parent-design ambiguity where `isLive` appeared in the hook's return shape but was also continuously written by the in-shell video event handler — single owner, no shared write.

## Scope

- New: `components/iptv/hooks/useIptvHls.ts` (hook + `UseIptvHlsResult` type).
- Move into hook: `loadChannel` (-> `reload`), `HLS_LIVE_CONFIG`, `LOADING_TIMEOUT_MS`, `getProxiedUrl`, `getSeekRange`, `filterHEVCLevels`, video event binding effect, unmount cleanup, all playback state (`error` / `isLoading` / `isLive` / `isPlaying` / `currentTime` / `duration` / `seekWindow` / `volume` / `isMuted`), and the toggle/seek handlers (`togglePlay` / `toggleMute` / `handleVolumeChange` -> `setVolumeLevel` / `handleSeek` -> `seekTo`).
- Stay in shell: `videoRef` / `progressRef` (passed into hook), `containerRef` / `controlsTimeoutRef`, UI state, `resetControlsTimeout`, `toggleFullscreen`, `routes` / `currentUrl` / `progressPercent`, keyboard effect, seek-step sync effect, fullscreenchange effect, route-reset effect, channel/route -> `reload` effect.

## Non-goals

- No change to HLS fallback order, proxy URL rules, HEVC filtering, loading timeout, or the idempotent `loadingResolved` gate.
- No change to keyboard bindings or key set.
- No `React.memo`, no memo reshuffling, no dynamic import of `hls.js`.
- No restyling, no class rename, no JSX restructure (state-source swap only).
- No unification with the main player's `useHlsPlayer` hook (IPTV stays local — see parent design's local-boundary note).

## Acceptance criteria

- [ ] `npx tsc --noEmit` zero errors.
- [ ] `npx next build` succeeds (full edge compilation).
- [ ] `<IPTVPlayer>` public prop surface unchanged; `IPTVChannelGrid.tsx` zero diff.
- [ ] HLS fallback order / custom-header short-circuit / loading timeout / HEVC filter all preserved (byte-equal blocks).
- [ ] Video event binding + keyboard bindings + key set preserved.
- [ ] Shell line count 619 -> ~320 or below.
- [ ] Full Phase 3: implement -> trellis-check -> trellis-update-spec -> commit -> archive. No step skipped.

## Rollback shape

Single feature branch from `main` (`0354651`). If check or build fails, discard the branch and re-plan.
