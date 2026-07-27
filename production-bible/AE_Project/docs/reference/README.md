# Reference (knowledge base)

Implements Production Bible §2 (Knowledge-Base Grounding) and Appendix A. Every DOM call, effect
match-name and expression member used by this generator is traceable to these connected repositories.

| Source repo | Used for |
|---|---|
| **AE** (*Awesome After Effects*) | Canonical plugin/tool catalog → the plugin strategy (`docs/plugins`, `src/plugins`). |
| **after-effects-scripting-guide** (docsforadobe) | ExtendScript DOM contract: `CompItem`, `Layer`, `Property`, `Sources`, `RenderQueue`, and `matchnames/effects/firstparty.md` (the effect identifiers in `src/effects`). |
| **after-effects-expression-reference** (docsforadobe) | Expression DOM: `wiggle`, `loopOut`, `linear`, `ease`, `time`, `thisComp`, `comp()`, `toComp`, `toWorld`, `seedRandom`, `posterizeTime`, `effect()`. |
| **after-effects-scripts** | Reusable rig patterns: loop expression (cycle/pingpong/offset/continue), maintain-stroke-width, posterize-time, find-all-expressions (Lottie audit). |
| **aequery** | Selector-style DOM traversal for validation/QA (`aeq('activecomp effect[matchName=...]')`). |
| **DuIO / DuAEF** | Framework option reference for creation/undo helpers. |
| **bodymovin** | Lottie-safe constraint set for the optional web-export variant. |
| **VSCode-Adobe-Script-Runner** | Authoring/dev pipeline (`Cmd/Ctrl+R` hot-run into AE). |

## Key effect match-names used (first-party; ⚡ = GPU)
`ADBE Ramp`⚡ · `ADBE Fractal Noise`⚡ · `ADBE Glo2`⚡ · `ADBE Box Blur2`⚡ · `ADBE Lumetri`⚡ ·
`ADBE Tint`⚡ · `ADBE Linear Wipe` · `ADBE Wave Warp` · `CC Light Sweep` · `CC Particle Systems II` ·
plus Expression Controls `ADBE Slider Control` / `ADBE Color Control` / `ADBE Checkbox Control` /
`ADBE Layer Control`. Full table: Production Bible Appendix A.
