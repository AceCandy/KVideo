# Design: split-iptv-controls

## Strategy

Pattern B (mixed strategy): sink the JSX, keep state in the shell, sink only the one truly local hover state (`showVolumeSlider`). `TopBar` / `BottomControls` are presentational; they receive state + callbacks via props.

## What sinks vs stays

| Sinks into children | Stays in shell |
|---|---|
| TopBar JSX (LIVE / name / route counter / close) | All playback state (`isLive`, `isPlaying`, `currentTime`, `duration`, `seekWindow`, `volume`, `isMuted`, `currentRouteIndex`, `isFullscreen`, `showAllRoutes`, `showControls`, `seekStepSeconds`, `showSidebar`) |
| BottomControls JSX (progress / play / time / route selector / volume / sidebar toggle / fullscreen) | `videoRef` / `hlsRef` / `containerRef` / `progressRef` / timeout refs |
| `showVolumeSlider` hover state (only BottomControls reads/writes it; no effect / keyboard / HLS writer) | All handlers (`togglePlay`, `toggleMute`, `toggleFullscreen`, `handleSeek`, `handleVolumeChange`, `resetControlsTimeout`, `loadChannel`) |
| `MAX_VISIBLE_ROUTES` + `visibleRoutes` / `hasMoreRoutes` derivations (only BottomControls consumes) | All effects (HLS lifecycle, video events, keyboard, fullscreenchange, seek-step sync, route reset) |
| `VolumeIcon` derivation (pure function of `volume` + `isMuted`) | `progressPercent` useMemo; `routes` / `currentRouteIndex` / `currentUrl` (Error overlay + loadChannel effect still need them) |

## Module layout

```
components/iptv/iptv-controls/
  TopBar.tsx
  BottomControls.tsx
  types.ts
```

## Props contracts

### TopBarProps

```ts
interface TopBarProps {
  showControls: boolean;   // opacity gate
  isLive: boolean;         // LIVE badge
  channelName: string;
  routeIndex: number;      // 0-based currentRouteIndex
  routeCount: number;      // routes.length
  onClose: () => void;
}
```

Renders `线路 {routeIndex + 1}/{routeCount}` only when `routeCount > 1`.

### BottomControlsProps

Flat props (~20), grouped by responsibility via comments. Deliberately not sliced into sub-objects: a presentational shell<->child boundary that honestly forwards many props is simpler than a slice bag that only pretends to reduce the surface (Simplicity First beats the parent's >5-prop smell here).

```ts
interface BottomControlsProps {
  // visibility
  showControls: boolean;
  // progress (non-live only)
  isLive: boolean;
  duration: number;
  currentTime: number;
  progressPercent: number;
  progressRef: React.RefObject<HTMLDivElement>;
  onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
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
```

`showVolumeSlider` becomes internal `useState` inside `BottomControls`. `MAX_VISIBLE_ROUTES` becomes a module constant inside `BottomControls.tsx`.

## Equivalence notes

- `progressRef`: created in the shell (the `handleSeek` closure reads `progressRef.current.getBoundingClientRect()`), passed to `BottomControls` as a prop, attached to the progress `<div>`. Standard ref forwarding — behavior is identical; the ref object is the same across the boundary.
- `visibleRoutes` / `hasMoreRoutes` / `MAX_VISIBLE_ROUTES`: only `BottomControls` consumes them. Sinking the derivation keeps the same `slice(0, 3)` + length-compare logic.
- `showVolumeSlider`: was shell `useState(false)` driven only by `onMouseEnter` / `onMouseLeave` on the volume wrapper; never written by any effect, keyboard handler, or HLS callback. Migrating it into `BottomControls` is behavior-identical.
- `showAllRoutes`: the shell's route-reset effect (`setShowAllRoutes(false)` on channel change) writes it, so the state stays in the shell; `BottomControls` only receives the value + a toggle callback.
- `e.stopPropagation()` on every control button is preserved verbatim — the container-level `onClick={() => togglePlay()}` relies on it.
- `data-controls` attribute stays on both children's outer `<div>` — the container `onClick` filters via `closest('[data-controls]')`.

## Invariants

1. Container `onClick` behavior unchanged: `closest('[data-controls]')` / `closest('[data-sidebar]')` filtering still works (both children's outer div carries `data-controls`).
2. `showControls` opacity transition preserved verbatim (`duration-300`, `opacity-100` / `opacity-0 pointer-events-none`).
3. TopBar visuals: LIVE badge (red bg + pulsing dot), channel name `drop-shadow-lg`, route counter copy/color, close button size/icon — all byte-identical.
4. BottomControls progress bar: `h-1 hover:h-2`, accent fill, white dot hover opacity, `onClick={handleSeek}` — byte-identical.
5. Play / time display / route selector / volume slider / sidebar toggle / fullscreen button: classes, icons, sizes, `onChange` — byte-identical.
6. `MAX_VISIBLE_ROUTES = 3`; `visibleRoutes = showAllRoutes ? routes : routes.slice(0, MAX_VISIBLE_ROUTES)` equivalent after sink.
7. `VolumeIcon` selection (`muted || volume === 0 -> VolumeX`; `< 0.5 -> Volume1`; else `Volume2`) migrated verbatim into `BottomControls`.
8. `<IPTVPlayer>` public prop surface (5 props) unchanged; `IPTVChannelGrid.tsx` zero diff.
9. No state / effect / handler logic change except the `showVolumeSlider` migration and the `visibleRoutes` / `hasMoreRoutes` / `MAX_VISIBLE_ROUTES` / `VolumeIcon` derivations sinking.

## Risk & mitigation

| Risk | Mitigation |
|---|---|
| `progressRef` attach timing changes across boundary | Pass the ref object as a prop; `BottomControls` attaches it directly; `handleSeek` still reads `ref.current` from the shell closure — identical object |
| `data-controls` filtering breaks | Both children's outer `<div>` must keep `data-controls`; trellis-check verifies |
| 20+ prop `BottomControls` easy to mis-wire | After writing, diff each prop against the original shell JSX line-by-line; trellis-check does a per-prop comparison |
| Accidentally extracting Loading / Error overlays | Explicit non-goal; range limited to the TopBar and BottomControls blocks |
