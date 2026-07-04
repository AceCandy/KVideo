# Directory Structure

> How frontend code is laid out — based on actual module organization.

---

## Overview

Components live under `components/`, grouped by feature domain. Shared atoms sit in `components/ui/`. Routes are in `app/` (App Router, all Edge Runtime). State lives in `lib/store/`.

---

## Directory Layout

```
app/                      Next.js App Router routes (all Edge Runtime)
components/
  ui/                     Global UI atoms (Card, Badge, Button, Icon, Switch, ...)
  player/                 Player feature
    desktop/              Desktop player UI
      more-menu/          DesktopMoreMenu subcomponents + local atoms
    episode-list/         EpisodeList subcomponents
    hooks/                Player hooks (usePlayerSettings, useHlsPlayer, ...)
  settings/               Settings pages
    account/              AccountSettings subcomponents + shared types/utils
  iptv/                   IPTV feature
    iptv-sidebar/         ChannelSidebar subcomponent
lib/
  store/                  Zustand stores + localStorage primitives
  player/                 Player-domain utilities (source-list-utils, resolution-cache)
  hooks/                  Cross-cutting hooks (useResolutionProbe, ...)
```

---

## Shell + Subdirectory Pattern

When splitting a large component, the shell stays in place and subcomponents go into a sibling subdirectory named after the feature:

```
components/player/
  EpisodeList.tsx                 # shell (callers' import path unchanged)
  episode-list/
    SourcePanel.tsx
    EpisodeSection.tsx
    SourceRow.tsx
    types.ts                      # shared types for the subtree

components/player/desktop/
  DesktopMoreMenu.tsx             # shell
  more-menu/
    AdFilterGroup.tsx
    DanmakuGroup.tsx
    ToggleSwitch.tsx              # local atom (not in ui/)

components/settings/
  AccountSettings.tsx             # shell
  account/
    SessionCard.tsx
    ManagedAccountsList.tsx
    LegacyAccountsPanel.tsx
    types.ts
    utils.ts

components/iptv/
  IPTVPlayer.tsx                  # shell
  iptv-sidebar/
    ChannelSidebar.tsx            # self-contained sidebar (6-prop contract)
    types.ts
```

Why:
- Callers keep their import path (shell stays in place).
- Subtree-local types/utils live next to their consumers.
- Local atoms (e.g. `ToggleSwitch`) stay out of `ui/` when their usage is scoped to one subtree.

---

## `ui/` Boundary

`components/ui/` is for **truly global** atoms reused across features. A component used by only one subtree stays in that subtree's directory, even if it looks atom-like.

> Example: `ToggleSwitch` lives in `more-menu/` (only the player overlay menu uses it), while `Switch` lives in `ui/` (settings pages use it). See component-guidelines for the boundary decision.

---

## Type Re-Export Shim

When splitting moves a type out of the shell that callers imported, keep the import path stable with a re-export:

```ts
// EpisodeList.tsx (shell)
export type { SourceInfo } from './episode-list/types';
```

This keeps the public surface of the shell unchanged.

---

## Naming Conventions

- Files: `PascalCase.tsx` for components, `kebab-case.ts` for utilities, `useXxx.ts` for hooks.
- Subdirectories: `kebab-case`, named after the feature.
- One component per file.

---

## Examples

Well-organized subtrees: `components/player/episode-list/`, `components/player/desktop/more-menu/`, `components/settings/account/`, `components/iptv/iptv-sidebar/`.
