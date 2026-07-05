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

## Toast Notifications

Transient user feedback lives in a vanilla `createStore` (`toastApi` in `lib/store/toast-store.ts`), mirroring the domain-store pattern but **without** persistence — toasts are short-lived and must not survive reload.

Rules:

- **No React Context Provider.** Callers `import { toast } from '@/lib/store/toast-store'` and call `toast.success/error/info/warning(message, options?)` directly from a client event handler. Do not wrap the app in a `<ToastProvider>`.
- **Only `ToastViewport` subscribes** to the `toasts` list. Components that merely trigger a toast (e.g. `FavoriteButton`, `AddSourceModal`) do not subscribe and do not re-render when toasts change.
- **Z-index above the Modal layer.** Toasts render at `z-[10000]`; modals are `z-[9998]`/`z-[9999]`. Keep toasts visible inside open dialogs.
- **Accessibility.** Each toast uses `role="status"` (implicitly `aria-live="polite"`). Do not route toast text through the global `#aria-live-announcer` in `app/layout.tsx` — that region serves other announcements and would double-announce.
- **Background tasks stay silent.** Silent/automatic work (e.g. `useSubscriptionSync`) reports failures via `console.error`, not toast — surfacing a toast from a background loop violates its "work quietly" contract. Toasts are for *user-initiated* actions only.
- **Stacking.** Max `4` visible toasts (oldest dropped FIFO); default auto-dismiss is 3s (4s for `error`); callers may override `duration`.

> Example: `AddSourceModal` wraps its `onAdd` to call `toast.success('源已添加')` after the store mutation; form-validation failures still surface via the existing inline error and do not use toast.

---

## Common Mistakes

- Bubbling a ref up to the shell "just in case" (it belongs in its region).
- Editing an effect's dependency array during an unrelated refactor.
- Putting ephemeral UI state in a global store.
- Subscribing once in the shell and forwarding 13 props (let each child subscribe via the hook).
