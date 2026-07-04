# Implement: split-iptv-controls

## Ordered checklist

1. From `main`, cut `refactor/split-iptv-controls`.
2. Create `components/iptv/iptv-controls/types.ts` with `TopBarProps` + `BottomControlsProps`.
3. Create `TopBar.tsx`: migrate the shell top-bar JSX verbatim; wire props.
4. Create `BottomControls.tsx`: migrate the bottom-control JSX verbatim; add `MAX_VISIBLE_ROUTES` module constant; migrate `VolumeIcon` derivation; hold `showVolumeSlider` as internal `useState`.
5. Edit `IPTVPlayer.tsx`:
   - Remove the now-sunk `MAX_VISIBLE_ROUTES` constant, `visibleRoutes` / `hasMoreRoutes` derivations, `showVolumeSlider` state, and the `VolumeIcon` line.
   - Replace the TopBar JSX block with `<TopBar ... />`.
   - Replace the BottomControls JSX block with `<BottomControls ... />`.
   - Import both components.
6. `npx tsc --noEmit` -> 0 errors.
7. `npx next build` -> success.
8. `trellis-check`: independent review of the 9 invariants + per-prop diff against the pre-change shell.
9. `trellis-update-spec`: record any reusable lesson (presentational shell<->child ref-forwarding pattern).
10. Commit on the feature branch; fast-forward merge to `main`; archive the task; push.

## Validation commands

```bash
npx tsc --noEmit
npx next build
git diff --stat
git diff main -- components/iptv/IPTVChannelGrid.tsx   # must be empty
```

## Review gates

- tsc + build must pass before `trellis-check`.
- `trellis-check` must pass before spec update / commit.
- No Phase 3 step skipped (per `trellis-phase3-no-skip`).

## Rollback

Single feature branch. If check or build fails, discard the branch; `main` is unaffected.
