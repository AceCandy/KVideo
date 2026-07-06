# Quality Guidelines

> Hard rules for code quality, grounded in this project's actual conventions.

---

## Overview

KVideo (Next.js 16 App Router, all Edge Runtime, React 19, Tailwind v4) enforces the rules below. Source: `CLAUDE.md` plus lessons from completed refactor tasks.

---

## Language

- **All code in English**: identifiers, string literals (except user-facing copy), comments.
- **All user-facing copy in Chinese**: button labels, titles, toasts, errors.
- Comments describe **intent / constraints / domain meaning**, never a construction log.

```ts
// Good: intent + constraint
// Seek step clamped to [1, 120] to prevent accidental huge jumps
const step = normalizeSeekStepSeconds(raw);

// Bad: construction log
// Step 1: normalize the value
// FIXED: handle NaN
```

---

## Surgical Changes

- Touch only lines that trace directly to the request.
- Do not refactor adjacent code or "optimize while here".
- Clean up orphans **you** created; never remove pre-existing dead code without explicit authorization.
- Prefer adding a new method over editing an existing one when the user did not ask for a behavior change.

> Example: While splitting `EpisodeList`, the dead `SourceSelector.tsx` was left untouched and the new component was named `SourcePanel` to avoid a name clash. The dead file was removed only in a later, separately authorized task.

---

## Zero Visual Regression (during refactor)

When extracting a component, **migrate classNames character-by-character**. Do not merge, simplify, or reorder classes without proving equivalence.

Substitutes when no browser is available:
- `npx tsc --noEmit`
- `npx next build`
- A className equivalence table (old vs new), checked field by field.

> Example: The `ToggleSwitch` extraction kept the `isRotated` size branches, glow shadow, and disabled state byte-for-byte; an equivalence table was used because no local browser/docker was available.

---

## Design Tokens & Glass Surfaces

- **Glass surfaces need `backdrop-blur`.** Any sticky/overlay surface using the translucent `--glass-bg` (navbar, modals, capsule controls) must pair with a `backdrop-blur-*` utility. Without it, scrolling content bleeds through and fogs the surface — a direct violation of DESIGN.md's "Glass Is Not Fog" rule. The main `Navbar` shipped without blur and had to be patched.
- **Shadows use tokens, not literals.** Use `--shadow-sm` / `--shadow-md` / `--shadow-lg` (hover lift) / `--shadow-focus-glow` (focus ring) from `app/styles/variables.css`. Do not inline `0 8px 24px ...` or re-declare the focus `color-mix` at call sites. New shadow needs → add a token first.
- **Accent color uses tokens.** Use `--accent-color` / `--accent-color-rgb` for any accent-tinted decoration (glows, transparent fills, focus rings). Do not hardcode the iOS system-blue family — `#007AFF`, `rgba(0, 122, 255, ...)`, `#5ac8fa`, `#0056b3` — anywhere, in components OR in `app/styles/*.css`. The literals drifted in from non-token sources across both layers. `--accent-color-rgb` is theme-aware (light `0, 86, 179` / dark `26, 109, 191`), so replacing a literal also fixes dark-mode hue drift.
- **Focus glow uses the `--shadow-focus-glow` token at call sites.** Write `focus:shadow-[var(--shadow-focus-glow)]`; do not re-inline the equivalent `0_0_0_3px_color-mix(in_srgb,var(--accent-color)_30%,transparent)` in component classNames — it duplicates the token definition and silently drifts if the token changes. (Tailwind `focus:ring-[...]` takes a color, not a box-shadow — use the sibling color token `--accent-focus-color` there: `focus:ring-[var(--accent-focus-color)]`. Both tokens share the same `accent 30%` value but bind to different CSS properties.)
- **Drop dead `color-mix` fallback lines.** When a rule carries a progressive-enhancement pair `rgba(literal); color-mix(token)` and the literal is an accent color the token already expresses, delete the literal line and keep only the `color-mix`. A retained dead iOS-blue fallback re-introduces the exact drift the token was meant to prevent. Reserve fallbacks for colors that cannot be derived from a token (e.g. the gray `rgba(128,128,128,...)` scrollbar thumb, which has no gray token).
- **Hoist shared visual behavior to the skeleton.** When the same hover/transition appears across multiple consumers, put it on the shared skeleton once instead of duplicating it in each consumer's className.

> Lesson: `PosterCard` hover scale was duplicated in two consumers (`MovieCard`, `PremiumContentGrid`) and missing in two others (`VideoCard`, `VideoGroupCard`); the duplicates were cleaned up when the behavior moved onto the `PosterCard` skeleton.

> Lesson: Inline focus-glow `color-mix` and iOS-blue literals (`rgba(0,122,255,...)`) were spread across `Input.tsx`, `PasswordGate.tsx`, `SegmentedControl.tsx`, and three CSS files; consolidating them onto `--shadow-focus-glow` / `--accent-color-rgb` also removed four dead fallback lines that an earlier progressive-enhancement pass had left behind.

> Lesson: Tailwind `focus:ring-[...]` sites in `AddSourceModal.tsx` / `LinkImportTab.tsx` duplicated the focus color via inline `color-mix`; they moved onto a new `--accent-focus-color` color token, sibling to the `--shadow-focus-glow` box-shadow token. The premium amber focus ring stayed in the Tailwind `amber-500` family — amber is a brand color, not an accent-token candidate — and the iOS-teal `#5ac8fa` progress-fill gradient stop was dropped for solid `--accent-color`.

---

## Forbidden Patterns

| Pattern | Reason |
|---|---|
| AI tool names (Claude / Codex / Grok / Gemini) in commits, comments, PR bodies, authorship | Project is de-AI'd |
| Progress words (FIXED / Step / Phase / Week / Section / AC-x) in commits or comments | Commits are not construction logs |
| `/init` | Forbidden |
| commit / merge / push without asking | Requires explicit user authorization |
| Skipping Trellis `trellis-check` / `trellis-update-spec` | See below |

---

## Trellis Flow Must Be Complete

Every task runs the full Phase 3:

```
implement -> trellis-check -> trellis-update-spec -> commit -> archive
```

- `trellis-check`: an independent Agent verifying the change matches `prd` / `design`.
- `trellis-update-spec`: distill conventions into `.trellis/spec/` (fill the guide even if it was an empty template).

> Lesson: four consecutive refactor tasks skipped `update-spec`, leaving every frontend guide as an empty template and conventions unsedimented.

---

## Common Mistakes

- Cleaning unrelated dead code during a refactor (do it in a separate task).
- Merging "looks equivalent" classNames during extraction (visual regression).
- Self-review instead of an independent `trellis-check`.
- Jumping straight to commit without `update-spec`.
