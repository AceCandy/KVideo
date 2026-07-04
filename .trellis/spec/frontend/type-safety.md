# Type Safety

> Type patterns used across the codebase.

---

## Overview

Strict TypeScript. Types are co-located with their consumers when local, centralized when shared. No runtime validation library — types are trusted at boundaries set by route handlers.

---

## Type Organization

| Scope | Location | Example |
|---|---|---|
| Local to a subtree | subtree `types.ts` | `episode-list/types.ts` (`Episode`, `SourceInfo`, `EpisodeListProps`) |
| Shared across a feature | feature `types.ts` | `settings/account/types.ts` (`LoginMode`, `AccountInfo`) |
| Global / cross-feature | `lib/types/` | `VideoSource` (in `lib/types/index.ts`) |
| Store-specific | in the store file | `AppSettings`, `AdFilterMode` in `settings-store.ts` |

---

## Props Slicing with `Pick`

When a presentational child needs a subset of the shell's props, slice with `Pick` rather than redeclaring:

```ts
// episode-list/EpisodeSection.tsx
import type { EpisodeListProps } from './types';

type EpisodeSectionProps = Pick<
  EpisodeListProps,
  'episodes' | 'currentEpisode' | 'isReversed' |
  'onEpisodeClick' | 'onToggleReverse' |
  'episodeSectionCollapsed' | 'onEpisodeSectionCollapseChange'
>;
```

This keeps the contract in one place (`EpisodeListProps` in `episode-list/types.ts`) and avoids drift.

---

## Type Re-Export Shim

When a type moves during a split, re-export from the shell so callers keep their import path:

```ts
// EpisodeList.tsx (shell)
export type { SourceInfo } from './episode-list/types';
```

---

## Required vs Optional Props

Mark a prop required only if the component cannot render without it. When the shell derives a required value before rendering, narrow it with a guard and assert:

```tsx
const showSourceSelector = !!sources && sources.length > 1 && !!onSourceChange;
return (
  <>
    {showSourceSelector && (
      <SourcePanel sources={sources!} onSourceChange={onSourceChange!} ... />
    )}
  </>
);
```

The `!` is safe because the guard guaranteed the value.

---

## Native Disabled over JS Guards

For interactive elements, prefer the native `disabled` attribute over a JS guard inside `onClick`:

```tsx
// Good
<button disabled={!ready} onClick={doThing}>...</button>

// Bad
<button onClick={() => ready && doThing()}>...</button>
```

> Source: `ToggleSwitch` — `disabled={!danmakuApiUrl}` blocks the click natively; `onChange` runs unguarded.

---

## Forbidden Patterns

| Pattern | Reason |
|---|---|
| `any` | Loses safety; use `unknown` + narrow |
| Re-declaring a prop type that already exists | Use `Pick` / re-export |
| Removing `!` after a guard because lint complains | The guard is the proof |

---

## Common Mistakes

- Drift between a child's props and the shell's after slicing (use `Pick`).
- Breaking the public type surface of a shell during a split (use a re-export shim).
