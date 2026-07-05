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

## Custom Slider Accessibility

Custom `<div>` sliders (e.g. `DesktopProgressBar`, `DesktopVolumeControl`) must be operable by keyboard and announced as sliders to assistive tech — native `<input type="range">` gets this for free; a styled `<div class="slider-track">` does not.

Required on the track element:
- `role="slider"`, `tabIndex={0}`, `aria-label`, `aria-orientation`, `aria-valuemin` / `aria-valuemax` / `aria-valuenow`, plus `aria-valuetext` when the raw number is unclear (e.g. `mm:ss / mm:ss` for progress).
- `onKeyDown` handling ArrowLeft/Right/Up/Down (step) and Home/End (extent), each calling `preventDefault()` to stop page scroll.
- A `.slider-track:focus-visible` outline in CSS so keyboard users can see the focus.

Conventions:
- Steps: progress ±5s, volume ±5%. Reuse value-based entry points extracted from the pointer handlers (`seekTo(time)` in `useProgressControls`, `setVolumeTo(v)` in `useVolumeControls`) — do not synthesize fake pointer events.
- A slider that can collapse (volume bar) must use `tabIndex={-1}` while collapsed so it never enters the keyboard tab sequence when invisible.
- Keep existing pointer/touch handlers untouched when adding keyboard support; keyboard is a parallel path, not a rewrite of the drag logic.

---

## Skip Link & Main Landmark

Every unlocked screen (rendered through `app/layout.tsx`) must let keyboard and screen-reader users bypass repetitive navigation in one keystroke:

- A `<a className="skip-link" href="#main-content">` as the first focusable element, visually hidden off-screen until `:focus` (see `.skip-link` in `globals.css`).
- Page content wrapped in `<main id="main-content" tabIndex={-1}>` so the skip target is programmatically focusable — `tabIndex={-1}` is required for the browser to actually move focus there.
- The skip link lives inside `PasswordGate`'s children so it only appears once unlocked; the lock screen is a single form and does not need it.

---

## Live Regions (aria-live)

Two non-overlapping channels for telling screen-reader users about state changes:

- `#aria-live-announcer` (declared in `app/layout.tsx`) is the global polite live region for cross-component / non-visual status. Write to it via `announce(message)` from `lib/utils/aria-announce.ts` — never set its `textContent` directly. `announce` clears then re-sets on a tick so identical consecutive messages still re-announce.
- Component-local immediate feedback (a toast, an inline status) uses `role="status"` on the element itself; do **not** also route the same message through `announce`, or SR users hear it twice.

Use `announce` for outcomes the user cannot infer from the currently focused element — e.g. parallel search completion (`useSearchAction` reports "搜索完成，找到 N 条结果" / "未找到相关内容"). Avoid it for high-frequency progress updates; polite regions still queue and can flood the SR queue.

---

## Keyboard Navigation Strategy

Keyboard users are served by three layered mechanisms — do **not** add ad-hoc roving-tabindex logic on top of them:

- Plain **Tab order** across the page (default focus ring; the skip-link bypasses repetitive nav).
- `useKeyboardNavigation` for directional nav inside a single list/grid (arrow keys, optional Home/End, Enter/Escape) — opt-in per container via `containerRef` + `itemCount`.
- `useSpatialNavigation` (TV mode) for 2D arrow-key nav across all `[data-focusable]` elements.

Roving tabindex on arbitrary control groups (e.g. the player button row) is not required: Tab order is compliant there, and the player's own sliders already handle Arrow keys (see Custom Slider Accessibility). Reach for `useKeyboardNavigation` only when a list/grid genuinely needs in-group arrow nav.

Video subtitles are out of scope: the project has no VTT / `<track>` playback (danmaku is comments, not captions), so caption-track accessibility is N/A.

---

## Modal / Dialog

New dialogs use `<Modal>` (`components/ui/Modal.tsx`), which owns the accessible-dialog contract so callers do not reimplement it:

- `<Modal>` provides `role` (default `dialog`, or `alertdialog` for confirms), `aria-modal="true"`, `aria-labelledby` (caller passes a `useId()`-generated `titleId` and puts it on the title element), focus trap (Tab cycles inside), focus restore (returns to the trigger on close), Escape-to-close, and body scroll lock.
- Caller responsibilities: pass `isOpen`, `onClose`, `titleId`, optional `initialFocusRef` (element to focus on open), and render title + body as children. Reuse `ModalHeader` for the title row with a close button.
- Do **not** add a second backdrop, a second ESC listener, or `overflow:hidden` on the body — `Modal` already handles them.

All dialogs now use `<Modal>`: `ConfirmDialog`, `ExportModal`, `AddSourceModal`, `ImportModal`. `SearchHistoryDropdown` is intentionally **not** a `<Modal>` — it is a `role="listbox"` dropdown anchored under the search input (combobox pattern) with its own keyboard navigation; do not wrap it in `<Modal>`.

---

## Common Mistakes

- Splitting an unsplittable effect chain.
- Using `visibleSources.indexOf` instead of a global index (slice offset bug).
- Extracting a row component and piling up `children` / props (violates simplicity).
