# Starlight Reverie — After Effects 2026 Project Generator

A commercial-grade, modular ExtendScript build system that procedurally generates the
**"Starlight Reverie"** kawaii / magical-girl looping hero scene inside Adobe After Effects 2026,
exactly as specified in the [Production Bible](../PRODUCTION-BIBLE.md).

This is not a demo script. It is architected like an internal production tool: a source tree of
single-responsibility modules that a build step assembles into one deliverable, `dist/FINAL_PROJECT.jsx`.

## Status

Implemented in staged order (see `CHANGELOG.md`). Current stage: **Stage 1 — Core Architecture**.

## Source of truth (in priority order)

1. `../PRODUCTION-BIBLE.md` (v1.0) — the approved design contract.
2. The connected GitHub knowledge base — Awesome-AE plugin catalog, docsforadobe **scripting guide**
   (DOM + effect **match-names**), **expression reference**, and the reusable script rigs.
3. Official Adobe After Effects 2026 documentation.

The generator implements the Bible; it does not redesign it.

## Layout

| Path | Responsibility |
|---|---|
| `docs/` | Architecture, scene design, implementation, performance, plugin and reference docs |
| `src/core/` | Namespace, config, logger, deterministic RNG, safe-DOM guards, environment bootstrap |
| `src/utilities/` | Project / folder / composition / layer / shape / color helpers |
| `src/controllers/` | `CTRL_Global` + `CTRL_Camera` master controller rigs |
| `src/camera/` | Cinematic camera system (rig, focus, DOF, parallax API) |
| `src/lighting/` | Ambient / key / rim light rig |
| `src/expressions/` | Reusable looping expression library |
| `src/animation/` | Animation engine (float / breathe / drift / twinkle / parallax appliers) |
| `src/effects/` | Glow / bloom / grade effect chains (match-name driven) |
| `src/particles/` | Fairy-dust + particle generators (plugin → built-in fallback) |
| `src/decorations/` | Flowers, hearts, stars, sparkles, bokeh, orbs, ribbon, trails |
| `src/scene/` | System builders S01..S12 and master assembly |
| `src/plugins/` | Plugin detection + capability negotiation |
| `src/validation/` | Automated self-tests and QA gate |
| `build/` | Build manifest (module load order) |
| `dist/` | Assembled deliverable `FINAL_PROJECT.jsx` (generated at packaging stage) |
| `tools/` | `build.js` — the concatenator / packaging tool |
| `tests/` | Module self-tests |
| `examples/` | Usage / configuration examples |
| `assets/` | Drop `IMG_Character_Doll.png` here for the hero character |

## Running (after packaging)

Open `dist/FINAL_PROJECT.jsx` in After Effects 2026 (`File ▸ Scripts ▸ Run Script File…`) or hot-run
from VS Code via Adobe Script Runner (`Cmd/Ctrl+R`). The whole build runs in one undo group.

## Building from source

```bash
node tools/build.js            # assembles dist/FINAL_PROJECT.jsx from build/manifest.json
node tools/build.js --check    # assemble to a temp file and run node --check only
```
