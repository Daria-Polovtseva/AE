# src/core — foundation layer (Stage 1)

The dependency root. Everything else builds on these six modules. Loaded first (manifest order 00–50).

| Module | API | Responsibility |
|---|---|---|
| `00_namespace.jsxinc` | `SR`, `SR.registerModule`, `SR.has`, `SR.require` | The single global namespace + module registry + dependency guard. |
| `10_config.jsxinc` | `SR.config` | Single source of truth: sizes, palette, planes, counts, camera, control defaults, seed, `masterName`. |
| `20_logger.jsxinc` | `SR.Logger` | Levelled logger (info/warn/error), buffer, file writer, summary counts. |
| `30_random.jsxinc` | `SR.Random` | Deterministic Mulberry32 PRNG + `loopPeriod` / `loopRate` seamless-loop helpers. |
| `40_guards.jsxinc` | `SR.Guard` | Never-fail DOM wrappers: `set` / `expr` / `param` / `exprParam` / `addEffect` / `attempt`. |
| `50_env.jsxinc` | `SR.Env` | Host version gate, project bootstrap (32bpc/linearize/JS engine), `runInUndoGroup`. |

## Contracts
- Modules are ES3-safe IIFEs attaching to `$.global.SR`; no directives inside modules.
- No magic numbers outside `SR.config`. No bare globals. Single responsibility per file.
- Determinism: all randomness via `SR.Random`, seeded from `SR.config.seed`.

## Verify
```bash
node --check src/core/*.jsxinc          # per-module syntax
node tools/build.js --check             # concatenation + syntax of the assembled surface
```
In After Effects/ESTK, run `tests/core.selftest.jsx` for runtime assertions.
