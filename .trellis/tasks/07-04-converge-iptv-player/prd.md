# Converge IPTVPlayer into shell + subcomponents + HLS hook

## Background

`components/iptv/IPTVPlayer.tsx` (1062 lines) is a god component mixing six coupled responsibilities: HLS loading with three-route fallback, video event binding, keyboard shortcuts, a multi-level sidebar, top/bottom control bars, and ~25 states plus scattered effects. Readability and review cost are poor; further changes risk cross-concern regressions.

## Goal

Converge the god component into a thin shell plus self-contained subcomponents and a dedicated HLS hook, via three ordered child tasks. Each child is independently plannable, verifiable, and archivable; the shell shrinks progressively while runtime behavior stays byte-identical.

## Scope (overall)

- Pure structural refactor. Zero runtime behavior change. Zero visual regression.
- The public surface of `<IPTVPlayer>` (5 props: `channel`, `onClose`, `channels`, `onChannelChange`, `channelsBySource?`, `sources?`) stays unchanged.
- Call sites (`components/iptv/IPTVChannelGrid.tsx`) stay unchanged.
- No removal of pre-existing dead code unless it is orphaned by an extraction in this very task (then only the orphans this task created).

## Non-goals (overall)

- No perf optimizations (`React.memo`, memo reshuffling, dynamic import of hls.js).
- No changes to the HLS fallback algorithm, HEVC filtering, proxy URL rules, or seek-step logic.
- No changes to keyboard bindings or their key set.
- No restyling of any control or sidebar element.

## Task map (three ordered children)

| Child | Scope | Risk | Dependency |
|---|---|---|---|
| `split-iptv-sidebar` | Extract sidebar (multi-level tree + flat list + search debounce + expand/anchor state + auto-scroll/auto-expand effects) into a self-contained `ChannelSidebar` subcomponent | Low | None |
| `split-iptv-controls` | Extract top bar + bottom control bar (play / mute / volume / seek / route / fullscreen) as presentational children; state stays in shell | Medium | After sidebar child stabilizes |
| `extract-iptv-hls-hook` | Extract `loadChannel` + HLS lifecycle + error fallback chain + loading timeout into a `useIptvHls` hook | High | After controls child stabilizes |

Ordering is mandatory: each later child branches from the stable baseline left by the previous. Do not start a later child until the previous one is checked, committed, and archived.

## Cross-child acceptance criteria

- [ ] `npx tsc --noEmit` zero errors after every child.
- [ ] `npx next build` succeeds (full edge compilation) after every child.
- [ ] `<IPTVPlayer>` public prop surface unchanged; `IPTVChannelGrid.tsx` zero diff.
- [ ] HLS fallback order, proxy rules, HEVC filtering, loading timeout, keyboard bindings all preserved.
- [ ] Shell line count drops progressively (sidebar child: ~1062 -> ~860; controls child: ~860 -> ~520; HLS hook child: ~520 -> ~360, approximate).
- [ ] Every child runs the full Phase 3 flow: implement -> trellis-check -> trellis-update-spec -> commit -> archive. No step skipped.

## Rollback shape

Each child lives on its own feature branch branched from `main`. If a child fails check or build, discard the branch and re-plan; earlier archived children remain untouched on `main`.
