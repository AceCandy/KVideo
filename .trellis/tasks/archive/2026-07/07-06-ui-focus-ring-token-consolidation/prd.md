# Consolidate focus-ring color token and clear remaining iOS accent literals

## Goal

Close out the three remaining focus / accent drift points surfaced by the previous `ui-accent-token-consolidation` review: Tailwind `focus:ring-[color-mix(...)]` sites that duplicate the focus color, an amber focus ring expressed as a literal `rgba`, and an iOS-teal gradient stop. Bring the ring sites onto a shared color token, express the amber ring with Tailwind utilities, and drop the iOS-teal literal.

## Requirements

### Group A — Ring focus color token (zero visual change)

Tailwind `focus:ring-[...]` takes a color, not a box-shadow, so the box-shadow `--shadow-focus-glow` token does not apply. Introduce a color token that captures the same `accent 30%` value, and point the ring sites at it.

- `app/styles/variables.css` — add `--accent-focus-color: color-mix(in srgb, var(--accent-color) 30%, transparent);` alongside `--shadow-focus-glow`. Define it once in `:root` (it references theme-aware `--accent-color`, so a single definition resolves per theme).
- `components/settings/AddSourceModal.tsx` — three inputs replace `focus:ring-[color-mix(in_srgb,var(--accent-color)_30%,transparent)]` with `focus:ring-[var(--accent-focus-color)]` (ring widths `ring-4` unchanged).
- `components/settings/import/LinkImportTab.tsx` — same replacement on the URL input (`ring-2` unchanged).

### Group B — Amber focus ring via Tailwind utilities (minor visual adjustment)

- `components/PremiumPasswordGate.tsx` — replace `focus:shadow-[0_0_0_3px_rgba(245,158,11,0.3)]` on the password input with `focus:ring-[3px] focus:ring-amber-500/30`. Keep `focus:border-amber-500`. The literal `rgba(245,158,11,0.3)` is gone; the ring is now expressed with the same Tailwind `amber-500` family the rest of the component already uses.

### Group C — Drop iOS-teal gradient stop (visual change: progress fill loses gradient sheen)

- `app/styles/video-player.css` — `.progress-bar-glass .progress-fill` `background: linear-gradient(90deg, var(--accent-color), #5ac8fa)` → `background: var(--accent-color)`. The `#5ac8fa` iOS systemTeal literal is removed; the progress fill becomes solid accent, tracking the active theme.

## Constraints

- Surgical: touch only the listed sites. Do not alter ring widths (`ring-4` / `ring-2` / `ring-[3px]`), the amber border, or other properties of `.progress-fill`.
- The amber ring is intentionally NOT migrated to an accent token — amber is the premium brand color and stays in the Tailwind `amber-500` family.
- `--accent-focus-color` is a color (for `ring-[...]` / future `border-[...]`), distinct from the `--shadow-focus-glow` box-shadow token. Do not conflate them.
- No user-facing copy changes; code stays English-only.

## Acceptance Criteria

- [ ] Group A: `--accent-focus-color` defined in `variables.css`; no `focus:ring-[color-mix(in_srgb,var(--accent-color)_30%` remains in `AddSourceModal.tsx` / `LinkImportTab.tsx`; all four sites use `focus:ring-[var(--accent-focus-color)]`.
- [ ] Group B: no `rgba(245, ?158, ?11` focus literal in `PremiumPasswordGate.tsx`; amber ring uses `focus:ring-[3px] focus:ring-amber-500/30`.
- [ ] Group C: no `#5ac8fa` / `90, ?200, ?250` literal remains in `app/styles/`; `.progress-fill` background is `var(--accent-color)`.
- [ ] `npx tsc --noEmit` passes.
- [ ] No user-facing string changed.

## Out of Scope

- Establishing an amber CSS token system (the project consistently uses Tailwind `amber-500` utilities for warning / premium / 4K semantics; tokenizing amber is a separate, larger decision).
- Adjusting ring widths or the amber ring's visual strength.
- Other iOS system colors outside the accent family (e.g. status reds / greens used for proxy / direct badges).
