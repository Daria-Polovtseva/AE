# Changelog — Starlight Reverie Generator

All notable changes are recorded here. The project is built in the staged order mandated by the
implementation brief (Stage 1 → Stage 21), one stage per milestone, with approval gates between stages.

## [2.0.0] — in progress (modular rebuild)

The monolithic Phase-2 generator (`production-bible/build/Starlight_Reverie_Generator.jsx`, kept as a
validated reference) is being re-architected into a single-responsibility module tree assembled by a
build tool. Behaviour and design values are preserved from the validated monolith; structure, testability
and maintainability are upgraded to commercial-tool standard.

### Stage 1 — Core Architecture ✅
- Established project source tree (`docs/ src/ build/ dist/ tests/ examples/ tools/ assets/`).
- `src/core/00_namespace` — global `SR` namespace + module registry + dependency guard.
- `src/core/10_config` — single source of truth (sizes, palette, planes, counts, camera, seed).
- `src/core/20_logger` — levelled logger with buffer, file writer and summary counts.
- `src/core/30_random` — deterministic Mulberry32 PRNG + loop-safe period/rate helpers.
- `src/core/40_guards` — never-fail DOM wrappers (`set/expr/param/exprParam`) + typed errors.
- `src/core/50_env` — AE version gate + project bootstrap (32bpc, linearize, JS expression engine) + undo-group wrapper.
- `build/manifest.json` — module load order.
- `tools/build.js` — Node concatenator/packaging harness.

### Upcoming
- Stage 2 Utilities · Stage 3 Project Builder · Stage 4 Composition Builder · Stage 5 Folder Builder
- Stage 6 Controllers · Stage 7 Camera · Stage 8 Lighting · Stage 9 Background · Stage 10 Foreground
- Stage 11 Decorations · Stage 12 Particles · Stage 13 Ribbon · Stage 14 Glow · Stage 15 Reflection
- Stage 16 Animation Engine · Stage 17 Expression Library · Stage 18 Plugin Integration
- Stage 19 Optimization · Stage 20 Validation · Stage 21 Packaging → `dist/FINAL_PROJECT.jsx`
