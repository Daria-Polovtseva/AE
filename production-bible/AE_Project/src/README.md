# `src/` — module map

Each module is a self-contained IIFE attaching one API to the global `SR` namespace (see
`../BUILD_NOTES.md`). Single responsibility. Load order is authoritative in `../build/manifest.json`.

| Directory | Modules (planned) | Responsibility |
|---|---|---|
| `core/` | `00_namespace 10_config 20_logger 30_random 40_guards 50_env` | Foundation: namespace, data, logging, RNG, safe-DOM, environment. **(Stage 1 ✅)** |
| `utilities/` | `project folder comp layer shape color` | Idempotent creation + geometry/color helpers. (Stage 2–5) |
| `controllers/` | `global camera` | `CTRL_Global` + `CTRL_Camera` master rigs. (Stage 6) |
| `camera/` | `rig focus parallax` | Cinematic camera system + reusable API. (Stage 7) |
| `lighting/` | `rig` | Ambient / key / rim light rig. (Stage 8) |
| `expressions/` | `library` | Reusable looping expression strings. (Stage 17) |
| `animation/` | `engine` | Appliers that attach expression rigs to properties. (Stage 16) |
| `effects/` | `glow bloom grade` | Match-name-driven effect chains. (Stage 14) |
| `particles/` | `dust` | Particle generators, plugin→built-in. (Stage 12) |
| `decorations/` | `daisy heart star sparkle bokeh orb ribbon trail` | Configurable atom generators. (Stage 11, 13) |
| `scene/` | `s01..s12 assembly` | System builders + master assembly. (Stage 9–15) |
| `plugins/` | `detect capabilities` | Plugin detection + capability negotiation. (Stage 18) |
| `validation/` | `checks qa` | Automated self-tests + QA gate. (Stage 20) |

`main` (the entry that runs the whole build in one undo group) is appended last by the manifest at packaging (Stage 21).
