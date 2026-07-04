# Split IPTV controls into presentational children

## Background

After C2.1 (`split-iotv-sidebar`, commit `fe591b8`) the shell is 742 lines but still inlines two large JSX blocks: the top bar (LIVE badge / channel name / route counter / close) and the bottom control bar (progress / play / time / route selector / volume / sidebar toggle / fullscreen). Both are purely presentational but interleaved with the shell's state, refs, handlers, and effects.

## Goal

Extract the top bar and bottom control bar as presentational children under `components/iptv/iptv-controls/`. The shell keeps all playback state, refs, handlers, and effects; children receive state + callbacks via props. Runtime behavior is byte-identical, visuals are byte-identical.

## Scope

- New: `iptv-controls/TopBar.tsx`, `iptv-controls/BottomControls.tsx`, `iptv-controls/types.ts`.
- In the shell, the two JSX blocks are replaced by `<TopBar />` / `<BottomControls />` calls.
- State stays in the shell. `progressRef` is passed to `BottomControls` as a prop (standard ref forwarding).
- Only `showVolumeSlider` (pure hover state, no effect / keyboard / HLS writer) sinks into `BottomControls` — Pattern B mixed strategy.
- `MAX_VISIBLE_ROUTES` constant + `visibleRoutes` / `hasMoreRoutes` derivations sink into `BottomControls` (only consumer).
- `VolumeIcon` derivation sinks into `BottomControls` (pure function of volume + isMuted).

## Non-goals

- Do NOT extract Loading / Error overlays (not listed in parent design; surgical range).
- No change to any state / handler / effect logic, invariant, keyboard binding, or HLS behavior.
- No `React.memo`, no memo reshuffling, no dynamic import.
- No restyling, no class rename, no icon / text change.

## Acceptance criteria

- [ ] `npx tsc --noEmit` zero errors.
- [ ] `npx next build` succeeds (full edge compilation).
- [ ] `<IPTVPlayer>` public prop surface unchanged; `IPTVChannelGrid.tsx` zero diff.
- [ ] TopBar / BottomControls visuals byte-identical (classes, icons, copy, transitions).
- [ ] `progressRef` / `handleSeek` / route selector / volume / fullscreen / sidebar-toggle behavior unchanged.
- [ ] Shell line count 742 -> ~600 or below.
- [ ] Full Phase 3: implement -> trellis-check -> trellis-update-spec -> commit -> archive. No step skipped.

## Rollback shape

Single feature branch from `main`. If check or build fails, discard the branch and re-plan; earlier archived children stay untouched on `main`.
