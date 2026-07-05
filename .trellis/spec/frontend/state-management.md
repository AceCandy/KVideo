# State Management

> Where state lives and how it flows.

---

## Overview

- **Global state**: Zustand stores in `lib/store/`, persisted to `localStorage` via shared primitives.
- **Server state**: fetched in route handlers (`app/api/...`) or server components; clients call `fetch`.
- **Local state**: `useState` / `useRef` in the owning component.

---

## Stores

Each domain has its own store under `lib/store/`:

```
auth-store.ts
favorites-store.ts
history-store.ts
iptv-store.ts
search-history-store.ts
settings-store.ts          # central app settings (player, search, danmaku, ...)
user-sources-store.ts
premium-mode-settings.ts   # premium-mode overrides on top of settings-store
settings-helpers.ts        # export/import helpers for settings + history
```

Stores share a `profiledKey()` localStorage-key primitive from `lib/utils/profile-storage.ts`, so each store keys its persistence by user profile.

Settings follow a typed `AppSettings` interface in `settings-store.ts`; the store exposes getters, setters, and React subscription hooks (`usePlayerSettings`, etc.).

---

## State Categories

| Category | Location | Example |
|---|---|---|
| Global, persistent | Zustand store + localStorage | `autoSkipIntro`, `danmakuEnabled`, `sortBy` |
| Local UI | `useState` in owning component | `isAdFilterOpen` (in `AdFilterGroup`), `sourceExpanded` (in `SourcePanel`) |
| Ref / imperative | `useRef`, sinks with owning region | `buttonRefs`, `sourceItemRefs` |
| Derived | `useMemo` next to its inputs | `sortedSources`, `currentSourceInfo` |

---

## When to Promote to Global

Promote to a store when:
- The value must persist across reloads (settings, history, favorites).
- Multiple unrelated subtrees read or write it.

Keep local when:
- Only one subtree reads it.
- It is ephemeral UI state (open/closed, hover).

> Example: `isAdFilterOpen` stays inside `AdFilterGroup` — only that component reads it. `adFilterMode` lives in `settings-store` — it must persist and is read by the player.

---

## Ref Ownership

Refs sink with their owning region during a split. They do not bubble up to the shell.

> Example: In `EpisodeList`, `sourceItemRefs` belongs to `SourcePanel` and `buttonRefs` belongs to `EpisodeSection`. The shell holds no refs to source rows or episode buttons.

---

## Effect Dependency Chains

Do not split an effect from the state it writes, and do not change a stable dependency array without reason.

> Example: `AccountSettings`' `fetchAccounts` is consumed by two effects with deps `[]` and `[canManageAccounts, fetchAccounts, loginMode]`. These were preserved exactly during the split.

---

## Store Subscriptions

Zustand domain stores are created with vanilla `createStore` and bound to hooks, so the same store can be consumed two ways:

- **Inside React**: `useStore(api, selector)` — subscribe to a narrow slice.
- **Outside React** (sync loops, event handlers): `api.getState()` / `api.subscribe()`.

Rules:

- Never subscribe to two stores unconditionally. A `useFavorites(isPremium)`-style helper must pick one store dynamically (`useStore(isPremium ? premiumApi : normalApi, selector)`), not call both `useXxxStore()` and `usePremiumXxxStore()` at the top level — otherwise every consumer re-renders on either store changing.
- High-frequency consumers (e.g. `FavoriteButton`, rendered once per search card) must subscribe via selector to only the slice they render (`isFavorite(videoId, source)`), not the whole store object. Action references (`toggleFavorite`) are stable and do not cause re-renders.
- Bound hooks (`useFavoritesStore`) also expose `getState` / `setState` / `subscribe` for non-React callers — preserve these when refactoring a `create`-based store to `createStore`.

> Example: `FavoriteButton` uses `useStore(favoritesApi, s => s.favorites.some(...))` so toggling a favorite re-renders only that button, not every card in the grid.

---

## Common Mistakes

- Bubbling a ref up to the shell "just in case" (it belongs in its region).
- Editing an effect's dependency array during an unrelated refactor.
- Putting ephemeral UI state in a global store.
- Subscribing once in the shell and forwarding 13 props (let each child subscribe via the hook).
