# PRD: Split IPTVPlayer sidebar into ChannelSidebar

## Background

`components/iptv/IPTVPlayer.tsx` (1062 lines) mixes the sidebar with the player shell. The sidebar is an independent state island — it touches no `videoRef` / `hlsRef` / playback state — yet it is inlined across roughly 200 lines of the shell, blocking further convergence.

## Goal

Extract the sidebar into a self-contained `ChannelSidebar` subcomponent under `components/iptv/iptv-sidebar/`, moving its entire state group, effects, refs, and render functions out of the shell. The shell shrinks by ~200 lines; behavior stays byte-identical.

## Scope

- Pure structural refactor. Zero runtime behavior change. Zero visual regression.
- The sidebar's state group, effects, `activeChannelRef`, and three render functions move into `ChannelSidebar` (Pattern A: partition extraction).
- `showSidebar` (the boolean that gates whether the sidebar is rendered) stays in the shell, because the bottom-bar toggle button and the click-to-play guard on the outer container both read it.
- The `<IPTVPlayer>` public prop surface (5 props) is unchanged; `IPTVChannelGrid.tsx` is unchanged.

## Non-goals

- No change to search debounce timing (200 ms) or the `useTransition`-based non-blocking filter.
- No change to multi-level tree rendering, source/group ordering, active-source/active-group sticky badges, or "显示更多" pagination step (50).
- No change to auto-expand behavior (active source/group auto-expanded on channel change) or auto-scroll (active channel scrolled to center).
- No unification with `components/player/EpisodeList.tsx` or any other list component.
- No extraction of the top bar, bottom control bar, or HLS logic (those are later children).

## Acceptance criteria

- [ ] `npx tsc --noEmit` zero errors.
- [ ] `npx next build` succeeds (full edge compilation).
- [ ] `<IPTVPlayer>` public prop surface unchanged; `IPTVChannelGrid.tsx` zero diff.
- [ ] `ChannelSidebar.tsx` holds the full sidebar state group and the three sidebar effects; the shell no longer declares any sidebar-specific state.
- [ ] The shell still owns `showSidebar` and renders `{showSidebar && <ChannelSidebar ... />}`.
- [ ] Design.md invariants (sidebar visuals, effect behavior, search, pagination) all preserved.
