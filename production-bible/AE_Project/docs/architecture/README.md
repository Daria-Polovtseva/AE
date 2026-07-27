# Architecture

Implements Production Bible §9 (Scene Engineering), §10 (Composition), §11 (Folders), §12 (Layers), §13 (Controllers).

## Namespace + module model
A single `SR` object on `$.global` (created by `src/core/00_namespace`). Every module is a self-contained
IIFE attaching one API surface to `SR` and calling `SR.registerModule(id)`. No bare globals. See
[`../../BUILD_NOTES.md`](../../BUILD_NOTES.md).

## Layered dependency graph (load order)
```
core (namespace → config → logger → random → guards → env)
  → utilities (project, folder, comp, layer, shape, color)
    → controllers → camera → lighting
      → expressions → animation
        → effects → particles → decorations
          → scene (S01..S12 builders) → scene/assembly
            → validation → main (entry)
```
Data flows strictly **downstream**: controllers are read by expressions; expressions never write to
controllers (no cycles). The single source of truth for values is `SR.config`; the single source of
truth for runtime art-direction is the `CTRL_Global` / `CTRL_Camera` controller nulls in the master comp.

## Build pipeline
`build/manifest.json` (ordered file list) → `tools/build.js` (concatenate + wrap + syntax-check) →
`dist/FINAL_PROJECT.jsx` (single deliverable, runs in one undo group).

## Restart safety
`SR.Env` bootstraps color management + expression engine idempotently; the scene builder namespaces all
created items and clears a prior build before rebuilding, and refuses to delete a managed folder that
still holds unmanaged user content.
