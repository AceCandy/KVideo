# Consolidate focus-glow and iOS-blue accents to design tokens

## Goal

Finish the token consolidation surfaced as out-of-scope by the previous `ui-polish-glass-motion-tokens` review. Three classes of stray literals remain in the codebase: inline focus-glow `color-mix`, hardcoded iOS system blue (`0, 122, 255`) in decoration, and dead iOS-blue fallbacks already overridden by `color-mix`. Bring them all onto the `--shadow-focus-glow` / `--accent-color-rgb` tokens so accent decoration tracks the active theme.

## Context

`--accent-color-rgb` is theme-aware (light `0, 86, 179` / dark `26, 109, 191`), whereas the stray literal is iOS system blue `0, 122, 255`. Replacing the literal with the token therefore shifts hue (iOS blue → theme accent, slightly deeper), it is not a byte-for-byte swap. This hue shift is approved. The focus-glow replacements are exactly equivalent to the existing inline `color-mix` and are zero visual change.

## Requirements

### Group A — Inline focus-glow → `--shadow-focus-glow` token (zero visual change)

- `components/ui/Input.tsx` — replace `focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-color)_30%,transparent)]` with `focus:shadow-[var(--shadow-focus-glow)]`.
- `components/PasswordGate.tsx` — same replacement on the username input and the password input (two sites).

### Group B — iOS-blue decoration literal → `rgba(var(--accent-color-rgb), N)` (hue shift)

- `components/ui/SegmentedControl.tsx` — sliding-indicator glow `shadow-[0_2px_8px_rgba(0,122,255,0.3)]` → `rgba(var(--accent-color-rgb),0.3)`.
- `app/styles/base.css` — TV-mode focus `box-shadow: 0 0 0 6px rgba(0, 122, 255, 0.2)` → accent-rgb.
- `app/styles/video-player.css` — spinner glow `0 0 20px rgba(0, 122, 255, 0.3)` → accent-rgb.
- `app/styles/video-player.css` — `.menu-item.active` background `rgba(0, 122, 255, 0.2)` → accent-rgb.
- `app/styles/video-player.css` — `.btn-glass/.btn-icon:focus-visible` box-shadow `0 0 0 3px rgba(0, 122, 255, 0.5)` → accent-rgb at the same `0.5` strength (do not downgrade to the 30% focus token).

### Group C — Remove dead iOS-blue fallbacks (zero visual change on modern browsers)

- `app/styles/search-history.css` — drop the `rgba(0, 122, 255, ...)` line in `.search-history-item:hover`, `.search-history-item.highlighted` background, and `.search-history-item.highlighted` inset box-shadow. Each is immediately overridden by the following `color-mix(in srgb, var(--accent-color) ...)` line.
- `app/styles/base.css` — drop the `rgba(0, 122, 255, 0.6)` line in `::-webkit-scrollbar-thumb:hover`, overridden by the following `color-mix` line.

## Constraints

- Surgical: touch only the twelve sites listed. Do not alter other `rgba(128, 128, 128, ...)` / glass-bg fallback pairs — those are not iOS blue and are out of scope.
- `--accent-color-light: #0056b3` and `--accent-color-rgb-light: 0, 86, 179` in `variables.css` are token definitions, not stray literals — leave them.
- No user-facing copy changes; code stays English-only.
- `.btn-glass/.btn-icon:focus-visible` keeps its `0.5` strength to preserve the existing player focus emphasis; only the color source changes.

## Acceptance Criteria

- [ ] Group A: no inline `color-mix(in_srgb,var(--accent-color)_30%` in `Input.tsx` / `PasswordGate.tsx`; all three use `var(--shadow-focus-glow)`.
- [ ] Group B: no `rgba(0, ?122, ?255` literals remain in `components/` or `app/styles/` other than `variables.css` token definitions.
- [ ] Group C: the four dead iOS-blue fallback lines are removed; each affected rule keeps a single `color-mix` declaration.
- [ ] `npx tsc --noEmit` passes.
- [ ] No user-facing string or layout size changed.

## Out of Scope

- Non-iOS-blue fallback pairs (scrollbar gray `rgba(128,128,128,...)`, `.search-history-remove:hover` gray).
- Adjusting the `0.5` strength of the player focus ring.
- Re-evaluating whether `color-mix` browser support still warrants any fallback strategy (decided: drop the dead iOS-blue ones only).
