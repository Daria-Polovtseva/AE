# tools/

- **`build.js`** — Node concatenator/packaging harness. Reads `build/manifest.json`, strips stray
  ExtendScript directives from modules, concatenates in order, wraps in `#target aftereffects` + an outer
  guard that cleans `$.global.SR` after the run, and runs a `node --check` syntax pass.

```bash
node tools/build.js            # -> dist/FINAL_PROJECT.jsx
node tools/build.js out.jsx    # custom output
node tools/build.js --check    # syntax-only, no dist written
```

No external dependencies (Node stdlib only).
