# Component Guidelines

> How components are split, bounded, and contracted — based on actual refactors.

---

## Overview

Several large components have been split: `AccountSettings` (713 lines), `DesktopMoreMenu`, `EpisodeList` (657 lines). The patterns below come from those tasks.

---

## Split Patterns

### Pattern A — Partition Extraction (symmetric)

Use when each region owns its refs / state / effects cleanly (e.g. `EpisodeList`).

- Each region's refs / state / effects **sink together** into the owning subcomponent.
- **No `forwardRef` / `useImperativeHandle`** — refs stay self-contained in their region.
- The shell only composes.
- **Visibility-gated mount simplifies effect deps.** When the sunk component mounts only while a shell flag is true, its effects can drop that flag from their deps: the mount run replaces the flag's false->true trigger, and the remaining deps cover in-open changes. Source: `IPTVPlayer`'s sidebar auto-scroll effect went from deps `[showSidebar, channel.url]` to `[channel.url]` after sinking into `ChannelSidebar` (mounted via `{showSidebar && <ChannelSidebar/>}`) — both original trigger branches preserved.

> Example: `EpisodeList` became a 52-line shell plus `episode-list/SourcePanel.tsx`, `episode-list/EpisodeSection.tsx`, `episode-list/SourceRow.tsx`, `episode-list/types.ts`. `listRef` / `buttonRefs` sank into `EpisodeSection`; `sourceItemRefs` sank into `SourcePanel`.

### Pattern B — Mixed Strategy (asymmetric)

Use when the shell has an unsplittable coupling (effect dependency chain).

- Unsplittable effects / fetches stay in the shell.
- Independent pure-UI state sinks as a whole.
- Presentational children: state stays in the shell, passed via props.
- **A state can sink into a presentational child when no effect / keyboard / fetch handler writes it — only that child's own DOM events do.** Cross-boundary state (written by effects or global handlers) stays in the shell and is passed via props. Source: in `IPTVPlayer`'s `BottomControls`, `showVolumeSlider` (driven only by the volume wrapper's `onMouseEnter` / `onMouseLeave`) sank into the child, while `showAllRoutes` (written by the shell's route-reset effect) stayed in the shell as a prop.
- **Forward a ref through props when a shell closure needs it.** The shell creates the ref (its handler reads `ref.current`), passes the ref object as a normal prop, and the presentational child attaches it to its node — no `forwardRef` / `useImperativeHandle`. Source: `progressRef` is created in `IPTVPlayer` (the `handleSeek` closure reads its bounding box) and forwarded to `BottomControls`, which attaches it to the seek bar.

> Example: In `AccountSettings`, `fetchAccounts` is consumed by two effects and writes several states — it **cannot be split**, so Managed draft state stayed in the shell. Legacy state is fully independent and sank into `LegacyAccountsPanel`. In `IPTVPlayer`'s controls split, `TopBar` + `BottomControls` are presentational — all playback state and `progressRef` stay in the shell, with only the local volume-hover state sinking.

### Signs the shell cannot sink

- A ref is used by positioning math or as a portal target (`DesktopMoreMenu`'s `buttonRef` / `menuRef`).
- An effect dependency chain spans multiple states (`AccountSettings`' `fetchAccounts`).
- A `createPortal` target depends on `containerRef.current`.

---

## Presentational vs Self-Contained

| Type | State | Example |
|---|---|---|
| Presentational | Stays in shell, passed via props | `SessionCard`, `LoginModeBanner`, `ManagedAccountsList` |
| Self-contained | Sinks into the child | `LegacyAccountsPanel`, `SourcePanel` (latency state) |

Rule: is the state independent of the shell's fetch / effects? Independent -> sink; coupled -> keep in shell.

---

## Local Component vs Global UI Atom Boundary

**Do not force-unify components with different visuals or usage.**

> Example: `components/ui/Switch.tsx` (settings pages; checkbox + peer; 50x30; no glow) and `components/player/desktop/more-menu/ToggleSwitch.tsx` (player overlay menu; button + role=switch + glow; 40x24) **coexist on purpose**. Their visuals, DOM semantics, and usage scope all differ; merging would regress one side.

Checklist before merging two similar components:
- Same visuals (size / shadow / radius)?
- Same DOM semantics (checkbox vs button+role)?
- Same usage scope (global vs one subtree)?

Any "no" -> keep it local in its subdirectory; do not promote to `ui/`.

---

## Controlled Contract

Toggles / selectors are controlled:

```ts
interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  isRotated: boolean;
  disabled?: boolean;
}
```

The parent owns the state; the component holds none. When `disabled`, rely on the native button `disabled` to block clicks — no JS guard.

---

## Forbidden Patterns

| Pattern | Reason |
|---|---|
| `forwardRef` only to sink a ref | Partition sinks refs without it |
| Shell forwarding 13+ props | Let each child call the store/hook itself (see hook-guidelines) |
| Force-unifying visually different siblings | Regression risk |
| Extracting a whole row when only the toggle repeats | Extract only the truly duplicated part |

---

## Common Mistakes

- Splitting an unsplittable effect chain.
- Using `visibleSources.indexOf` instead of a global index (slice offset bug).
- Extracting a row component and piling up `children` / props (violates simplicity).
