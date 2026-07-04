# Implement: IPTVPlayer convergence (parent orchestration)

## Execution order (strict)

The parent is orchestration-only; it does not edit code directly. Work proceeds one child at a time, in order:

1. `split-iptv-sidebar` (low risk) — branch from `main`, complete full Phase 3, archive.
2. `split-iptv-controls` (medium risk) — branch from `main` after child 1 lands, complete full Phase 3, archive.
3. `extract-iptv-hls-hook` (high risk) — branch from `main` after child 2 lands, complete full Phase 3, archive.

Do not start a later child until the previous one is committed to `main` and archived. If a child's check or build fails, fix in place or discard the branch; do not carry a broken child forward.

## Per-child flow (mandatory, no skipping)

Every child runs the complete Phase 3 sequence:

1. Write the child's `prd.md` / `design.md` / `implement.md`.
2. Review gate, then `task.py start <child-slug>`.
3. Implement on a feature branch from `main`.
4. `trellis-check` — independent agent verifies the change matches the child's `prd` / `design` and the parent's cross-child invariants; self-fixes or reports.
5. `trellis-update-spec` — distill any new convention into `.trellis/spec/frontend/`.
6. Commit on the feature branch; fast-forward merge to `main`.
7. `task.py archive <child-slug>`.

Skipping check or update-spec is forbidden (see memory `trellis-phase3-no-skip`).

## Validation commands (after every child)

- `npx tsc --noEmit`
- `npx next build`

## Parent completion

The parent is marked complete only after all three children are archived and the shell reaches its target size. No direct commit on the parent branch; the parent's `task.json` is finalized via `task.py archive` once child 3 is archived.

## Rollback points

Each child is an independent rollback unit. Earlier archived children on `main` are never re-opened to fix a later child's regression — the regression is fixed on the later child's branch.
