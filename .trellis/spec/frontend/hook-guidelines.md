# Hook Guidelines

> Custom hooks: when to extract, how to subscribe.

---

## Overview

Hooks live next to their domain: player hooks in `components/player/hooks/`, cross-cutting hooks in `lib/hooks/`. State hooks wrap the Zustand stores.

---

## Custom Hooks

| Hook | Location | Purpose |
|---|---|---|
| `usePlayerSettings(isPremium)` | `components/player/hooks/` | Subscribes to player settings; returns values + setters |
| `useHlsPlayer` | `components/player/hooks/` | hls.js lifecycle |
| `useInfiniteSlice` | `lib/hooks/` | Infinite-scroll slicing (used by `VideoGrid`, `FavoritesGrid`) |
| `useKeyboardNavigation` | `lib/hooks/` | Arrow-key navigation for lists/grids (used by search lists and `EpisodeSection`) |
| `useResolutionProbe` | `lib/hooks/` | Probes source resolution |

---

## Subscribing to Stores

Each store exposes a React hook. **Call the hook in each component that needs the value** — do not subscribe once in the shell and forward a dozen props.

```tsx
// Good: each child subscribes
function DanmakuGroup({ isPremium }: Props) {
  const { danmakuEnabled, setDanmakuEnabled } = usePlayerSettings(isPremium);
  // ...
}

// Bad: shell forwards 13 props
function DesktopMoreMenu(props) {
  const settings = usePlayerSettings(props.isPremium);
  return <DanmakuGroup {...manyProps} />;
}
```

Why:
- Keeps child props minimal (`isPremium` + visual flags only).
- Re-render boundaries stay clear (a danmaku change re-renders only `DanmakuGroup`).
- Multiple components subscribing to the same store is normal React; the cost is negligible for short-lived subtrees (e.g. an open menu).

> Source: `DesktopMoreMenu` split chose per-child subscription over shell-forwarding to avoid ~13 props.

---

## When to Extract a Hook

Extract when the same stateful logic appears in 2+ places, or when a component mixes unrelated concerns.

> Example: `useInfiniteSlice` was extracted because `VideoGrid` and `FavoritesGrid` hand-wrote the same IntersectionObserver pattern.

---

## Heavy Dependencies: trust the bundler's default splitting

This project has **zero** `next/dynamic` / `React.lazy`. Heavy runtime deps are imported statically at the top of the file, e.g. `import Hls from 'hls.js'` in `components/player/hooks/useHlsPlayer.ts` and `components/iptv/IPTVPlayer.tsx`.

The default webpack/Next.js code-splitting already isolates a heavy dep used only by some pages into its own chunk. Verified in `bundle-optimization`: the player/iptv-only `hls.js` chunk is not loaded by the home page. So a manual `import type` + dynamic `import()` rewrite was rejected as zero-gain (it only delays the player's first frame).

Rule:
- Default to a static `import X from 'pkg'`.
- Only consider `import type` + dynamic `import()` if a future build actually shows the dep in a chunk that loads on unrelated pages.

---

## Common Mistakes

- Forwarding a long props list instead of letting each child subscribe.
- Adding `next/dynamic` / manual chunk-splitting without a measured build-size benefit (the default already splits per-route).
- Forgetting the `cancelled` flag in an async effect (setState after unmount).
