# Design: IPTVPlayer convergence (parent)

## Coupling analysis

The component has one unsplittable core and several separable regions.

**Unsplittable core — `loadChannel` + HLS lifecycle.** `loadChannel` closes over `videoRef` / `hlsRef` / `loadingTimeoutRef`, six state setters, and the channel's custom headers. Inside it, a nested fallback chain (`tryDirectVideo` -> `tryWithProxy` -> direct video, plus `filterHEVCLevels`) shares mutable `triedProxy` / `triedDirect` flags. This is the analog of `AccountSettings.fetchAccounts`: consumed by the channel/route effect and the retry button, writing many states. It cannot be partitioned; it can only be lifted as a whole into a hook (child 3).

**Separable regions:**

- Sidebar — independent state island (`sidebarSearch`, `filteredResults`, `sidebarVisibleCount`, `expandedSources`, `expandedGroups`, `activeChannelRef`, plus its search debounce, auto-expand, and auto-scroll effects). Touches no `videoRef` / `hlsRef` / playback state. Callback surface is narrow: `onChannelChange` + close. This is Pattern A (partition extraction), the lowest-risk first cut.
- Top/bottom control bars — presentational. State (`isPlaying`, `volume`, `isMuted`, `currentTime`, `duration`, `seekWindow`, `isLive`, `isFullscreen`, route index) must stay in shell because the keyboard effect and HLS state machine write it. Controls receive state + callbacks via props. Pattern B (mixed strategy).
- Keyboard handler — stays in shell. Reads `videoRef` directly and calls the toggle callbacks; cannot sink with the controls because the controls do not own `videoRef`.

## Strategy per child

| Child | Pattern | What sinks | What stays in shell |
|---|---|---|---|
| `split-iptv-sidebar` | A (partition) | Sidebar state group + 3 sidebar effects + `activeChannelRef` + render functions (`renderMultiLevelSidebar` / `renderFlatChannelList` / `renderChannelButton`) + `toggleSource` / `toggleGroup` / `toggleActiveSource` / `toggleActiveGroup` | `showSidebar` (gates whether to render `<ChannelSidebar>`); sidebar toggle button in the bottom bar |
| `split-iptv-controls` | B (mixed) | Top bar JSX; bottom control bar JSX; volume slider sub-tree; route selector sub-tree | All playback state, `videoRef`, all toggle/seek handlers, keyboard effect, HLS state machine |
| `extract-iptv-hls-hook` | hook extraction | `loadChannel` + `HLS_LIVE_CONFIG` + `getSeekRange` + `filterHEVCLevels` + the loading-timeout lifecycle + HLS error fallback chain; returns `{ error, isLoading, isLive, reload }` | `videoRef` (passed into the hook); the channel/route effect that calls `reload(currentUrl)` |

## Directory layout (target, after all three children)

```
components/iptv/
  IPTVPlayer.tsx          # shell: composes, owns videoRef + keyboard + playback state
  iptv-sidebar/
    ChannelSidebar.tsx    # self-contained sidebar (child 1)
    types.ts              # ChannelSidebarProps + shared sidebar types
  iptv-controls/
    TopBar.tsx            # presentational (child 2)
    BottomControls.tsx    # presentational (child 2)
    types.ts
lib/hooks/
  useIptvHls.ts           # HLS lifecycle hook (child 3)
```

Sidebar uses a subdirectory named `iptv-sidebar/` (not `sidebar/`) to match the existing `components/player/episode-list/` convention and avoid collisions.

## Cross-child invariants (must hold after every child)

1. HLS fallback order is unchanged: direct (or proxied when custom headers) -> proxy HLS -> direct video -> proxied direct video, with HEVC levels filtered on `MANIFEST_PARSED` for both the initial and proxy attempts.
2. Custom-header channels (`httpUserAgent` / `httpReferrer`) skip the direct attempt and go straight through the proxy on first try.
3. Loading timeout (30s) fires `markError('加载超时...')` exactly once; `markLoaded` / `markError` are idempotent via the `loadingResolved` flag.
4. Keyboard bindings and their key set are unchanged (space/k, f, m, escape, arrow + l/j, volume up/down).
5. All sidebar visuals are byte-identical: source/group/tree indentation, badges, active highlight, search spinner, "显示更多" pagination, collapse rotation.
6. `<IPTVPlayer>` public prop surface (5 props) and `IPTVChannelGrid.tsx` call site are unchanged.

## Local-component boundary (no cross-player unification)

`ChannelSidebar` is local to `components/iptv/`. Do NOT attempt to unify it with `components/player/EpisodeList.tsx` or any other list — different data shape, different visuals, different scope. See `component-guidelines.md` "Local Component vs Global UI Atom Boundary".

## Risk and mitigation

| Risk | Mitigation |
|---|---|
| Sidebar extraction drops or reorders an effect (auto-expand / auto-scroll / search debounce) | Move effects together with the state they read; list all three in the child's invariant checklist; trellis-check verifies |
| Controls extraction widens the shell's prop forwarding past the ~13-prop smell threshold | Keep handlers in the shell, pass only the minimal state + callback set; if a control needs >5 props, group them via a small props type rather than forwarding everything |
| HLS hook extraction breaks the `triedProxy` / `triedDirect` closure flags or the idempotent `loadingResolved` gate | Move the entire `loadChannel` body verbatim into the hook; do not refactor the fallback chain; trellis-check diff must show a pure move |
| Premature unification with the main player's hooks/components | Refused by design — IPTV stays in its own subtree |
