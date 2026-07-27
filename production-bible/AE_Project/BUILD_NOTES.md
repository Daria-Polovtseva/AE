# Build Notes — Starlight Reverie Generator

## Module model (how ExtendScript "modules" work here)

ExtendScript has no native module system. Every source module is a self-contained IIFE that attaches
its API to a single shared namespace object, `SR`, created on `$.global` by `src/core/00_namespace.jsxinc`:

```js
(function (SR) {
    SR.Logger = { /* ... */ };
    SR.registerModule("core/logger");
})($.global.SR);
```

This pattern is correct in **both** delivery modes:

- **Dev mode** — a module can be `#include`-d individually while iterating.
- **Production** — `tools/build.js` concatenates all modules in `build/manifest.json` order into one
  `dist/FINAL_PROJECT.jsx`, prefixed with `#target aftereffects` and terminated by the `main()` entry.

**Rules for module files (`.jsxinc`):**
1. No `#target` / `#include` directives inside modules (the build tool owns wiring + ordering).
   Cross-module dependencies are declared in a `// depends:` header comment and enforced by manifest order.
2. Attach to `SR`, never to bare globals. One responsibility per file.
3. ES3-safe only: `var`, function declarations, `for` loops. No `let/const`, arrow functions, template
   literals, or `Array.prototype` methods that are unreliable in ExtendScript.
4. Expression **strings** target the AE JavaScript expression engine; they are authored as concatenated
   strings and resolve controllers via `comp("MASTER_…")` so they work from inside any precomp.
5. Every builder cites its Production Bible section in a comment (`[Bible §N]`).

## Load order

`build/manifest.json` is the authoritative order. Core loads first (namespace → config → logger →
random → guards → env), then utilities, then feature modules, then the scene assembly, then `main`.

## Build tool

```bash
node tools/build.js                 # -> dist/FINAL_PROJECT.jsx
node tools/build.js out.jsx         # custom output path
node tools/build.js --check         # assemble to a temp file, run `node --check`, do not write dist
```

The tool strips stray directives, concatenates in manifest order, wraps in the AE target + an outer
guard that cleans `$.global.SR` after the run, and (optionally) syntax-checks the result.

## Determinism

All randomness flows through `SR.Random`, seeded from `SR.config.seed`. Re-running the generated JSX
produces an identical project. Instance variation constants are baked at generation time (not per-frame
`seedRandom`) for both determinism and expression-evaluation performance.

## Verification per stage

Each stage ends with: (a) `node --check` on every new module, (b) a concatenation check via
`node tools/build.js --check`, and (c) the relevant `tests/*.selftest.jsx` where applicable.
