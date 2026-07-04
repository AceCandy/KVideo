# Frontend Development Guidelines

> Concrete conventions for this project, distilled from completed refactor tasks.

---

## Overview

These guides document how KVideo's frontend actually works. Each guide is grounded in real files and past tasks, not an ideal template. Read the one relevant to your change.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module layout, shell + subdirectory pattern, `ui/` boundary | Filled |
| [Component Guidelines](./component-guidelines.md) | Split patterns, presentational vs self-contained, controlled contract | Filled |
| [Hook Guidelines](./hook-guidelines.md) | Store subscription, hook extraction, lazy heavy deps | Filled |
| [State Management](./state-management.md) | Zustand stores, ref ownership, effect dependency chains | Filled |
| [Quality Guidelines](./quality-guidelines.md) | Language rules, surgical changes, zero visual regression, Trellis flow | Filled |
| [Type Safety](./type-safety.md) | Type organization, `Pick` slicing, re-export shims | Filled |

---

## How These Were Filled

Each guide is sourced from completed tasks under `.trellis/tasks/archive/`:

- Component splits: `split-account-settings`, `split-desktop-more-menu`, `split-episode-list`, `split-iotv-sidebar`
- Atom extraction: `extract-toggle-switch`, `display-component-unify`
- Store: `store-consolidation`
- Bundle: `bundle-optimization`

When you complete a refactor, distill new conventions back here (Trellis `trellis-update-spec` step).

---

**Language**: All documentation is written in **English**.
