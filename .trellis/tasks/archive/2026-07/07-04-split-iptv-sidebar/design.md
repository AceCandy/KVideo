# Design: ChannelSidebar extraction (child 1)

## Split boundary

| Concern | Sinks into `ChannelSidebar` | Stays in shell |
|---|---|---|
| State | `sidebarSearch`, `filteredResults`, `isSearching` (useTransition), `sidebarVisibleCount`, `expandedSources`, `expandedGroups` | `showSidebar` |
| Ref | `activeChannelRef` | `videoRef`, `hlsRef`, `containerRef`, `controlsTimeoutRef`, `loadingTimeoutRef`, `progressRef` |
| Effects | auto-scroll, auto-expand, search debounce | video events, fullscreen listener, seek-step sync, keyboard handler, channel/route loader |
| Callbacks | `toggleSource`, `toggleGroup`, `toggleActiveSource`, `toggleActiveGroup` | `togglePlay`, `toggleMute`, `handleVolumeChange`, `handleSeek`, `toggleFullscreen`, `resetControlsTimeout`, `loadChannel` |
| Derived | `hasMultiSource`, `activeSourceId`, `activeGroupKey`, `activeSource`, `isSearchMode` | `routes`, `currentUrl`, `visibleRoutes`, `hasMoreRoutes`, `progressPercent`, `VolumeIcon` |
| Render fns | `renderChannelButton`, `renderMultiLevelSidebar`, `renderFlatChannelList` | — |
| JSX | the entire `{showSidebar && <div data-sidebar>...</div>}` block | `{showSidebar && <ChannelSidebar ... />}` |

`showSidebar` stays in the shell because the bottom-bar list button toggles it and the outer-container click guard reads it. The sidebar component is mounted only when `showSidebar === true`.

## Files

- `components/iptv/iptv-sidebar/ChannelSidebar.tsx` — self-contained sidebar.
- `components/iptv/iptv-sidebar/types.ts` — `ChannelSidebarProps`.

## Props contract

```ts
interface ChannelSidebarProps {
  channel: M3UChannel;
  channels: M3UChannel[];
  channelsBySource?: Record<string, { channels: M3UChannel[]; groups: string[] }>;
  sources?: IPTVSource[];
  onChannelChange: (channel: M3UChannel) => void;
  onClose: () => void;
}
```

Six props. The shell renders:

```tsx
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
```

## Effect migration (the one subtlety)

The original auto-scroll effect:

```ts
useEffect(() => {
  if (showSidebar && activeChannelRef.current) {
    activeChannelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
}, [showSidebar, channel.url]);
```

After sinking, `ChannelSidebar` only mounts when `showSidebar === true`, so the `showSidebar` guard is implicit in mount. The effect becomes:

```ts
useEffect(() => {
  if (activeChannelRef.current) {
    activeChannelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}, [channel.url]);
```

Equivalence: mount fires the effect once (covers `showSidebar` false->true); `channel.url` change with the sidebar already mounted fires it again (covers channel switch while open). Both branches of the original are preserved.

The search-debounce effect (200 ms, `useTransition`, empty-query reset of `filteredResults` + `sidebarVisibleCount`) and the auto-expand effect (`channel.sourceId` / `channel.group` -> add to `expandedSources` / `expandedGroups`) move verbatim; their deps are all sidebar-local after the move.

## Invariants (must hold after extraction)

### Behavior

1. Search debounce 200 ms; empty query clears `filteredResults` and resets `sidebarVisibleCount` to 50.
2. Auto-expand adds `channel.sourceId` to `expandedSources` and `${sourceId}::${group}` to `expandedGroups` on channel change.
3. Auto-scroll centers the active channel when the sidebar opens and when `channel.url` changes while open.
4. Active ordering: in `renderMultiLevelSidebar`, the active source is first in `orderedSources`; the active group is first in `orderedGroups`.
5. Channel-button active test is `ch.name === channel.name && ch.url === channel.url`; click calls `e.stopPropagation()` then `onChannelChange(ch)`.
6. Search mode wins: when `sidebarSearch` is non-empty, the flat filtered list renders regardless of multi-source.
7. Channel-button React key stays `${ch.sourceId || ''}-${ch.name}-${i}`.

### Visuals (byte-for-byte className migration)

8. Channel button: active -> `bg-[var(--accent-color)] text-white` + white pulse dot; inactive -> `text-white/70 hover:bg-white/10 hover:text-white`. Multi-route badge `text-[10px]`, active `bg-white/20`, inactive `bg-white/5 text-white/40`.
9. Source header: active source `bg-white/10 text-white`, else `text-white/90 hover:bg-white/10`; `<Icons.TV>` accent; count `text-[10px] text-white/40`; `<Icons.ChevronDown>` rotates 180 when expanded.
10. Group header: active group `bg-white/10 text-white`, else `text-white/60 hover:bg-white/5`; `<Icons.Tag>`; count `text-[10px] text-white/30`; chevron rotates.
11. Ungrouped block label `text-[10px] text-white/30 "未分组"`.
12. Flat-list pagination step 50; button reads `显示更多 (N 个频道)`.
13. Sticky current-badge row: source badge `bg-[var(--accent-color)]` when its source is expanded, else `bg-white/5 border-white/10`; group badge follows the same rule against `expandedGroups`.
14. Search input: `<Icons.Search>` absolute left, spinner absolute right when `isSearching`; input class unchanged.
15. Sidebar container `w-72 bg-[#111] border-l border-white/10 overflow-y-auto flex-shrink-0`; header sticky `bg-[#111]`.

### Imports

16. `ChannelSidebar.tsx` imports: `useRef, useEffect, useState, useCallback, useMemo, useTransition` from `react`; `Icons` from `@/components/ui/Icon`; `M3UChannel` from `@/lib/utils/m3u-parser`; `ChannelSidebarProps` from `./types`. `IPTVSource` is imported in `types.ts` only, not the component.
17. Shell removes the now-unused `useState`/`useTransition`/`useCallback`/`useMemo` imports only if nothing else in the shell still uses them (the shell still uses `useCallback`/`useMemo`/`useState` elsewhere, so only `useTransition` becomes removable — verify before removing).

## Risk and mitigation

| Risk | Mitigation |
|---|---|
| Auto-scroll behavior changes when `showSidebar` leaves the deps | Equivalence argued above; trellis-check re-verifies the two trigger branches |
| A sidebar-derived value (e.g. `activeSourceId`) is silently read by shell code | Pre-move grep confirms all readers are sidebar-internal; trellis-check audits |
| `useTransition` import becomes orphaned in shell | Remove only if unused after the move; tsc catches an unused import only under `noUnusedLocals`, so verify manually |
| A className is paraphrased during the move | Migrate verbatim; trellis-check diffs the sidebar JSX block |
