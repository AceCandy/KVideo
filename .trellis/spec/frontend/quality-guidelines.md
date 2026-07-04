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
