# Implement: ChannelSidebar extraction (child 1)

## Pre-flight

- Branch from `main`: `refactor/split-iptv-sidebar`.
- Re-read `components/iptv/IPTVPlayer.tsx` to confirm the current sidebar code matches the design's boundary table (no drift since planning).

## Execution order

1. Create `components/iptv/iptv-sidebar/types.ts` with `ChannelSidebarProps` (6 props, per design).
2. Create `components/iptv/iptv-sidebar/ChannelSidebar.tsx`:
   - `'use client'` directive.
   - Imports per design invariant 16.
   - Move verbatim: the sidebar state group, `activeChannelRef`, the derived values (`hasMultiSource` / `activeSourceId` / `activeGroupKey` / `activeSource` / `isSearchMode`), the three effects (auto-scroll with the migrated deps from the design's "Effect migration" section, auto-expand, search debounce), the four toggle callbacks, the three render functions, and the entire sidebar `<div data-sidebar>...</div>` block as the return value.
   - Accept the 6 props; call `onClose()` where the original called `setShowSidebar(false)`.
3. Edit the shell `components/iptv/IPTVPlayer.tsx`:
   - Add `import { ChannelSidebar } from './iptv-sidebar/ChannelSidebar';`.
   - Delete the sunk state declarations, `activeChannelRef`, sunk derived values, sunk effects, sunk callbacks, sunk render functions.
   - Replace the `{showSidebar && (<div data-sidebar>...</div>)}` block with `{showSidebar && (<ChannelSidebar channel={channel} channels={channels} channelsBySource={channelsBySource} sources={sources} onChannelChange={onChannelChange} onClose={() => setShowSidebar(false)} />)}`.
   - Remove the `useTransition` import only if the shell no longer references it (verify by grep within the file).
4. Validate: `npx tsc --noEmit`.
5. Validate: `npx next build`.

## Validation commands

- `npx tsc --noEmit` — props contract, import correctness, no orphaned references.
- `npx next build` — full edge compile.

## Review gate (before commit)

Dispatch `trellis-check` with this task active. The check agent verifies against `prd.md`, `design.md`, and the parent's cross-child invariants, focusing on:

- The design's 17 invariants (especially the auto-scroll effect equivalence and byte-for-byte className migration).
- No sidebar-derived value is still read by the shell.
- `showSidebar` and the public 5-prop surface are intact.
- Shell line count dropped (~1062 -> ~860).

## Spec update

After check passes, run `trellis-update-spec` to distill any new convention (e.g. a mounted-only-when-visible component dropping the visibility flag from an effect's deps). Skip only if there is genuinely nothing new — but justify it explicitly.

## Render-layer human verification (post-delivery)

Local has no dev/docker. The following are flagged for the user to verify next time the service runs:

- Open sidebar -> active channel is centered.
- Switch channel while sidebar open -> new active scrolls into view.
- Multi-source tree -> active source/group sorts first and auto-expands.
- Search -> debounce + non-blocking filter + flat result list.
- "显示更多" -> paginates 50 at a time.

## Not doing

- No top-bar / bottom-bar extraction (child 2).
- No HLS hook extraction (child 3).
- No unification with other list components.
- No restyling; classNames migrate verbatim.
