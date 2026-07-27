# Implementation

Implements Production Bible §18 (Production Pipeline) and §19 (Implementation Roadmap). See also the
validated reference monolith and its [report](../../../build/IMPLEMENTATION-REPORT.md).

## Stage log
The build proceeds strictly in the mandated order; each stage is gated by approval and ends with
`node --check` + a concatenation check.

| Stage | Scope | Module(s) | State |
|---|---|---|---|
| 1 | Core architecture | `src/core/*` | ✅ done |
| 2 | Utilities | `src/utilities/*` | pending |
| 3 | Project Builder | `src/scene/project` | pending |
| 4 | Composition Builder | `src/utilities/comp` | pending |
| 5 | Folder Builder | `src/utilities/folders` | pending |
| 6 | Controllers | `src/controllers/*` | pending |
| 7 | Camera | `src/camera/*` | pending |
| 8 | Lighting | `src/lighting/*` | pending |
| 9 | Background | `src/scene/s01_background`, `s02_nebula` | pending |
| 10 | Foreground | `src/scene/s05_character`, `s07_hearts` (near) | pending |
| 11 | Decorations | `src/decorations/*`, `src/scene/s08..s10,s12` | pending |
| 12 | Particles | `src/particles/*`, `src/scene/s11_dust` | pending |
| 13 | Ribbon | `src/decorations/ribbon`, `src/scene/s04_ribbon` | pending |
| 14 | Glow | `src/effects/glow`, `src/effects/bloom`, `s03_wishstar` | pending |
| 15 | Reflection | `src/scene/s06_reflection` | pending |
| 16 | Animation engine | `src/animation/*` | pending |
| 17 | Expression library | `src/expressions/*` | pending |
| 18 | Plugin integration | `src/plugins/*` | pending |
| 19 | Optimization | cross-cutting passes | pending |
| 20 | Validation | `src/validation/*`, `tests/*` | pending |
| 21 | Packaging | `tools/build.js` → `dist/FINAL_PROJECT.jsx` | pending |

## Coding standards (enforced)
Modular, single-responsibility, reusable, restart-safe, error-tolerant. Clean naming (Bible Appendix B),
helper functions over duplication, no magic numbers (all in `SR.config`), no temporary hacks. Every
module carries validation and cites its Bible section.
