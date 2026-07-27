# tests/

Per the brief, **every module carries validation**. Two layers:

1. **In-engine self-tests** (`*.selftest.jsx`) — small scripts that `#include` the relevant modules (or
   run against `dist/FINAL_PROJECT.jsx`) and assert on the built DOM: missing comps/controllers,
   duplicate layers/effects, plugin availability, invalid parenting/naming, expression errors.
2. **Static checks** — `node tools/build.js --check` (concatenation + syntax) run at the end of every stage.

`core.selftest.jsx` exercises the Stage-1 foundation (namespace, config integrity, RNG determinism,
loop-safe period math, logger). The QA gate module (`src/validation`, Stage 20) aggregates runtime checks
into a single pass/fail summary surfaced in the build dialog.
