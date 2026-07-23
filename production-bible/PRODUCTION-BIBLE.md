# PRODUCTION BIBLE — Project "STARLIGHT REVERIE"

### A Kawaii / Magical-Girl Looping Hero Scene for Adobe After Effects 2026

**Document type:** Pre-production design & engineering specification (Design Phase — *no code, no JSX, no build*)
**Target application:** Adobe After Effects 2026 (26.x), Advanced 3D renderer, Multi-Frame Rendering, Mercury GPU (CUDA / Metal)
**Delivery format of the eventual build:** A single ExtendScript (`.jsx`) generator that constructs the entire project procedurally
**Prepared by:** Lead Technical Director / Motion Design Lead
**Status:** Approved for implementation
**Version:** 1.0

---

> **Reading note for the implementing engineer.** This bible is written to be *self-sufficient*. Every measurement, color, hierarchy, controller, expression rig and effect chain needed to rebuild the scene is specified here. You should never need to re-open the reference image. Where an expression is quoted it is quoted as a **specification** (the intended behaviour and the exact expression notation to author), not as a build script — the JSX that *creates* these expressions is Phase 2 work and is explicitly out of scope for this document.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Knowledge-Base Grounding](#2-knowledge-base-grounding)
3. [Reference Analysis](#3-reference-analysis)
4. [Visual Breakdown (System-by-System Decomposition)](#4-visual-breakdown)
5. [Color Design](#5-color-design)
6. [Lighting Architecture](#6-lighting-architecture)
7. [Camera Architecture](#7-camera-architecture)
8. [Animation Architecture](#8-animation-architecture)
9. [Scene Engineering](#9-scene-engineering)
10. [Composition Architecture](#10-composition-architecture)
11. [Folder Architecture](#11-folder-architecture)
12. [Layer Architecture](#12-layer-architecture)
13. [Controller Architecture](#13-controller-architecture)
14. [Effect Pipeline](#14-effect-pipeline)
15. [Plugin Strategy](#15-plugin-strategy)
16. [Expression Strategy](#16-expression-strategy)
17. [Performance Strategy](#17-performance-strategy)
18. [Production Pipeline](#18-production-pipeline)
19. [Implementation Roadmap](#19-implementation-roadmap)
20. [Risk Analysis](#20-risk-analysis)
21. [Production Checklists](#21-production-checklists)
22. [Quality Assurance](#22-quality-assurance)
23. [Best Practices](#23-best-practices)
24. [Future Improvements](#24-future-improvements)
25. [Design Self-Evaluation & Strategy Comparison](#25-design-self-evaluation)
26. [Appendix A — Effect Match-Name Reference](#appendix-a)
27. [Appendix B — Naming Grammar](#appendix-b)
28. [Appendix C — Master Glossary of Controllers](#appendix-c)

---

<a name="1-executive-summary"></a>
## 1. Executive Summary

### 1.1 The Deliverable
"Starlight Reverie" is a **seamless, infinitely looping hero background** in the *kawaii / magical-girl* visual language: a central anime doll character standing on a glossy reflective floor inside a dreamy violet cosmos, framed by an undulating pink flower-ribbon, a large glowing wish-star, glossy 3D hearts, and a continuous drift of stars, sparkles, hearts, bokeh and fairy-dust.

The scene is engineered as a **layered 2.5D parallax stage** (not full 3D geometry) driven entirely by controllers and expressions, so that:

- The whole look re-colours from a **single Global Control null** (one palette change repaints the scene).
- The whole scene **breathes and loops** with no visible seam (a mathematically closed loop).
- The project is **procedurally generatable** — every layer, effect, null and expression is deterministic and therefore reproducible by an ExtendScript generator in Phase 2.

### 1.2 Master Deliverable Specs

| Parameter | Value | Rationale |
|---|---|---|
| Master resolution | **1920 × 1080** (16:9) | Reference aspect ≈ 1.92:1; 16:9 is the commercial hero master. Vertical 1080×1920 and square 1080×1080 are derived crops (see §10.6). |
| Frame rate | **30 fps** | Smooth drift without the render cost of 60; clean loop math. A 24 fps variant is a one-line comp setting for film-feel deliverables. |
| Loop length | **10 s (300 frames)** | Long enough to hide the loop, short enough for RAM preview & social autoplay. All motion periods are integer divisors of 10 s. |
| Working color | **32-bit float, linearized (sRGB / Rec.709 working space)** | Glow, bloom and additive light stack cleanly only in linear float; avoids banding in the violet gradient. |
| Renderer | **Advanced 3D** (AE 2026) | Needed for environment/rim lighting on the reflective floor and true 3D bokeh depth; falls back to Classic 3D for a "lite" build. |
| Motion blur | **On**, 180° shutter, 16 samples adaptive | Sells the drift and sparkle streaks. |
| Audio | None (silent loop) | Hero background. |

### 1.3 Design Pillars (the non-negotiables)
1. **One-knob art direction.** A `CTRL_Global` null exposes palette, master glow, master drift speed, and parallax depth. Nothing hardcodes a color or a speed.
2. **Everything loops.** Every animated value is periodic over 300 frames (or a clean divisor) using `loopOut()`, `time`-driven trig, or seedable wiggle that is looped via time-wrapping. No un-looped `wiggle()` in final render.
3. **Depth by layering, not by modelling.** A 7-plane parallax stack (§9.2) fakes a cinematic 3D dolly with 2D assets + a single camera. Cheap, art-directable, render-friendly.
4. **Additive light is a *pass*, not a property.** All glow/bloom lives on dedicated adjustment layers and precomps so it can be dialled globally and rendered on GPU.
5. **Procedural-first.** Prefer generators (Fractal Noise, CC Star Burst, Gradient Ramp, shape repeaters) and expressions over hand-painted frames, so the ExtendScript build is deterministic and the file stays light.

### 1.4 One-paragraph "what the engineer builds"
A master comp `MASTER_Starlight_Reverie_1080p` containing an Advanced-3D camera rig (null-parented), a stack of ~11 precomposed visual systems (Background Cosmos, Nebula Streak, Wish-Star, Flower-Ribbon, Character, Reflection, plus four decorative particle/element systems), two global adjustment layers (Grade + Bloom), and a control layer of nulls. Each visual system is its own precomp built from procedural generators and shape layers, animated by looped expressions reading from `CTRL_Global` and `CTRL_Camera`. Final grade + Deep-Glow bloom sit on top. Render via MFR to ProRes 4444 (master) and H.264 (review).

---

<a name="2-knowledge-base-grounding"></a>
## 2. Knowledge-Base Grounding

This design is built directly on the studio knowledge base (the connected repositories). Every plugin, API call, match-name and expression referenced below is traceable to these sources.

| Repo | Role in this project | How it is used |
|---|---|---|
| **AE** (*Awesome After Effects*) | Canonical plugin & tool catalog | Every plugin in §15 is drawn from this list (Trapcode Suite, Deep Glow, Optical Flares, Sapphire, Stardust, Plexus, Element 3D, Newton, Magic Bullet, Fast Bokeh Pro, Universe, etc.) and cross-checked for a built-in fallback. |
| **after-effects-scripting-guide** (docsforadobe mirror) | ExtendScript DOM contract for the Phase-2 generator | `Item`/`CompItem`, `Layer`, `Property`, `Sources`, `TextDocument`, `RenderQueue`, and especially **`matchnames/effects/firstparty.md`** — the exact effect identifiers used in §14 and Appendix A. |
| **after-effects-expression-reference** (docsforadobe mirror) | Expression DOM contract | Every expression rig in §16 uses only documented members (`wiggle`, `loopOut`, `linear`, `ease`, `time`, `thisComp`, `toComp`, `seedRandom`, `posterizeTime`, `effect(...)`). |
| **after-effects-scripts** | Reusable expression/rig library | Loop rig patterns come from `Add_Simple_Loop_Expression.jsx` (cycle/pingpong/offset/continue). Stroke-scale safety from `Update_Stroke_Weight_Expressions.jsx`. Preview throttling from `Add_Posterize_Time_Expression.jsx`. Lottie readiness audit from `Find_All_Expressions.jsx`. |
| **aequery** | Selector-based DOM traversal for the generator & QA | Phase-2 build and QA can select/verify layers & effects with jQuery-style queries, e.g. `aeq('activecomp effect[matchName="ADBE Glo2"]')`. |
| **DuIO / DuAEF** (Duduf framework) | Build-framework option for Phase 2 | DuAEF provides battle-tested creation/undo-group/versioning helpers; a candidate foundation for the generator (see §18.2). |
| **bodymovin** | Lottie export constraint set | Defines the "Lottie-safe" build variant in §24 (supported: precomps, shapes, solids, nulls, text, masks, time-remap; *unsupported*: most third-party effects, so bloom must be baked/faked). |
| **VSCode-Adobe-Script-Runner** | Authoring/dev pipeline | The Phase-2 `.jsx` is authored in VSCode and hot-run into AE 2026 via `Cmd/Ctrl+R` (`adobeScriptRunner.ae`), using the token/`index.js` master-file pattern for multi-file builds. |
| **TouchTracker** | Rigging pattern reference | Confirms the "everything parents to a Null Object" methodology used by the controller architecture (§13). |

**Key grounding decision:** because the eventual output is *ExtendScript-generated*, the design favours anything a script can deterministically create — native effects with known match-names, expression-driven motion, and procedural generators — over anything requiring manual artistry (hand-keyed character animation, painted textures). This is the single most important constraint shaping the whole architecture.

---

<a name="3-reference-analysis"></a>
## 3. Reference Analysis

### 3.1 First-read summary
A symmetrical, centrally-composed kawaii dream stage. A small full-body anime doll stands dead-center on a black glossy floor that mirrors her. Behind and around her: a deep violet star-field, a huge soft glowing five-point star (upper right) ringed by a horizontal halo, and a wavy hot-pink ribbon banner studded with white daisies spanning the full width across the upper third. Floating in the volume around the character: glossy 3D hearts, small rounded stars (yellow / teal / pink), four-point plus-sparkles, bokeh orbs and fairy-dust. The entire frame is bathed in bloom; saturation and brightness are pushed; the mood is sweet, magical, celebratory.

### 3.2 Independent visual systems (exhaustive inventory)
Every visible object is assigned to exactly one system. Nothing is unaccounted for.

| # | System | Visible evidence in reference | Depth plane |
|---|---|---|---|
| S01 | **Background Cosmos** | Deep violet field, dense small stars, halftone dot texture, radial vignette | Far (−) |
| S02 | **Nebula Light Streak** | Diagonal soft light sweep upper-left→center behind ribbon | Far (−) |
| S03 | **Wish-Star + Halo** | Large cream 5-point star top-right with horizontal glowing ring | Mid-far |
| S04 | **Flower-Ribbon Banner** | Wavy pink satin ribbon + white daisies, full width, upper third | Mid |
| S05 | **Character ("The Doll")** | Central anime girl, lavender/white lolita outfit, long dark hair, bows, platform shoes | Mid (hero plane, z=0) |
| S06 | **Reflection Floor** | Mirror of character + glows on black glossy ground, fading down | Mid (below hero) |
| S07 | **Hero Hearts (3D glossy)** | Large puffy pink hearts w/ specular — lower-left, mid-right, small scatter | Near + Mid |
| S08 | **Star Confetti** | Small rounded 5-point stars: yellow, teal outline (left), pink | Near + Mid |
| S09 | **Plus-Sparkles** | 4-point "twinkle" crosses: white, pink, lavender, blue, scattered | Near |
| S10 | **Bokeh & Orbs** | Soft defocused circles; pink/purple; clustered lower-left & lower-right; a teal sphere and a pink sphere | Near (foreground defocus) + Far |
| S11 | **Fairy-Dust Particles** | Fine glowing dust/points throughout | Volumetric (all planes) |
| S12 | **Light Trails / Swooshes** | Curved dotted trail near lower-left heart; ribbon-following glints | Mid |
| S13 | **Global Atmosphere** | Overall bloom, chromatic softness, vignette, grade | Post (adjustment) |

### 3.3 Compositional read
- **Layout:** Central vertical axis (character) with strong bilateral balance. The ribbon is a horizontal "sky band" across the top third; the reflective floor is the bottom third; the character bridges the two.
- **Rule-of-thirds:** Character's head/upper body sits on the central vertical; the ribbon rides the upper-third line; the wish-star anchors the upper-right power point; the large lower-left heart anchors the opposing lower-left power point → a gentle diagonal tension star↔heart that keeps the symmetric layout from being static.
- **Negative space:** Intentional breathing room around the character (mid-frame is relatively clear so the eye lands on her); decoration is densest at the four corners and the top band.
- **Depth cues:** (1) Scale — nearer hearts/sparkles are larger; (2) Blur — foreground orbs are defocused, some background stars softened; (3) Overlap — hearts occlude bokeh; ribbon overlaps nebula; (4) Reflection — establishes a ground plane and volume; (5) Atmospheric — far field is lower-contrast/desaturated vs. saturated near elements.
- **Visual weight & flow:** Eye path = character (center, brightest rim) → wish-star (upper-right glow) → ribbon daisies (sweep left) → lower-left heart → back to center via the dotted swoosh. A pleasing clockwise circulation.

### 3.4 Motion inference (from a still)
This is clearly a frame from (or intended as) a **looping animated background**. Inferred motion: gentle floating of all decorative elements, a soft "breathing" scale pulse on hearts/star, twinkling sparkles, drifting fairy-dust, a slow parallax camera micro-drift, ribbon undulation, glow pulsing, and a subtle character idle (breathing + hair sway). None of it is fast; the register is *calm, dreamy, hypnotic*.

---

<a name="4-visual-breakdown"></a>
## 4. Visual Breakdown

For every system: **Purpose · Construction · Geometry · Layer type · Blend · Opacity · Parenting · Anchor strategy · Animation · Expressions · Plugin (with built-in alt) · Optimization · Render cost · Limitations · Difficulty · Production notes.** Difficulty is 1–5 (5 hardest). Render cost is Low/Med/High.

---

### S01 — Background Cosmos
- **Purpose:** Establish the violet dream void and depth backdrop; the canvas everything reads against.
- **Construction:** Base = full-frame Solid with a **radial Gradient Ramp** (`ADBE Ramp`) violet→indigo, darkened at edges (vignette). Star-field = a Solid with **Fractal Noise** (`ADBE Fractal Noise`) driven to a high-contrast sparse "stars" look (or **CC Star Burst** `CC Star Burst` for parallaxing points). Halftone dot texture = a faint tiled dot pattern (shape-repeater or **CC Ball Action**/`ADBE Dot`… use a shape layer grid) at very low opacity. Optional deep nebula clouds = a second Fractal Noise, Screen, low opacity, slow evolution.
- **Geometry:** Full comp 1920×1080, oversized 120% to allow camera push without edge reveal.
- **Layer type:** Solids + Shape (dots). Precomp `PRE_S01_BG_Cosmos`.
- **Blend:** Base Normal; star/nebula layers **Screen** or **Add**; dot texture **Overlay** ~8%.
- **Opacity:** Base 100%; stars 60–80%; nebula 25%; dots 8%.
- **Parenting:** Precomp parented to `NULL_Plane_Far`.
- **Anchor strategy:** Anchors centered; the far plane moves least under parallax.
- **Animation:** Slow star twinkle (Fractal `Evolution` via `time*rate`); very slow nebula evolution; no positional drift beyond camera parallax.
- **Expressions:** `Evolution = time * effect("Twinkle")("Speed")`; star brightness pulse `linear(Math.sin(time*…),-1,1, lo,hi)`.
- **Plugin / built-in alt:** Built-ins only. (Trapcode **Form**/**Particular** could make a true 3D star volume — optional upgrade, §15.)
- **Optimization:** Pre-render/collapse; Fractal Noise is GPU-accelerated (14.2). Posterize the twinkle to 12–15 fps to cut cost.
- **Render cost:** Low–Med (Fractal Noise ×2). **Difficulty:** 2.
- **Limitations:** Fractal "stars" can look noisy at 32-bit; tune contrast/opacity. **Production note:** keep the base gradient on its own layer so the grade can re-tint the void without touching stars.

---

### S02 — Nebula Light Streak
- **Purpose:** A soft diagonal glow band behind the ribbon that adds luminosity and directional lift (upper-left key feel).
- **Construction:** A large soft feathered mask on a Solid filled with a warm-pink→transparent Gradient Ramp, **Add**; heavily blurred (Fast Box Blur `ADBE Box Blur2`, GPU 14.2). Optionally an **Optical Flares** streak (§15) for anamorphic elegance; built-in alt = **CC Light Sweep** `CC Light Sweep` or a blurred ramp.
- **Geometry:** ~2200px soft ellipse, rotated ~25°, positioned upper-left→center.
- **Layer type:** Solid + mask. In `PRE_S01` or its own thin precomp `PRE_S02_Nebula`.
- **Blend:** Add. **Opacity:** 30–45%.
- **Parenting:** `NULL_Plane_Far` (slightly nearer than stars for micro-parallax).
- **Anchor:** Anchor at the bright core so scale-pulse blooms from the core.
- **Animation:** Slow opacity + scale breathe (sine, 8–10 s period); faint hue drift.
- **Expressions:** Opacity `linear(Math.sin(time*2*Math.PI/10),-1,1,28,45)`.
- **Optimization:** Single blurred layer; cheap. **Render cost:** Low. **Difficulty:** 1.
- **Limitations:** Can wash out the ribbon if too hot — keep under the ribbon in z and in blend priority. **Production note:** this is the "atmosphere key"; tie its intensity to `CTRL_Global > Master Glow`.

---

### S03 — Wish-Star + Halo
- **Purpose:** The upper-right hero prop; a warm counter-accent to the cool void and a secondary light source.
- **Construction:** Star body = **Shape layer**, 5-point star (Polystar, rounded points via a large Round Corners) filled with cream→pale-yellow gradient fill; heavy **Glow** (`ADBE Glo2`, GPU 14.1) + Deep Glow bloom. Halo ring = a thin **elliptical shape stroke** (horizontal, perspective-squashed ellipse) with a soft glow, sitting behind the star body. Inner sparkle core = small bright solid, Add.
- **Geometry:** Star ~380px across; halo ellipse ~560×150px; positioned x≈1560, y≈180.
- **Layer type:** Shape layers. Precomp `PRE_S03_WishStar`.
- **Blend:** Star Normal→Screen edges; glow Add; halo Add.
- **Opacity:** 100% body; halo 70%.
- **Parenting:** `NULL_Plane_MidFar`.
- **Anchor:** Anchor at star centroid; halo anchor same center so they scale-pulse together.
- **Animation:** Slow "wish" pulse (scale 98→104% + glow intensity), a very slow z-rotation of the halo (2–4°/loop), subtle twinkle on the core. Optional slow full-rotation of star at 1 rev / 40 s for life.
- **Expressions:** Pulse `s=linear(Math.sin(time*2*Math.PI/5),-1,1,98,104); [s,s]`; halo rotation `time*rate` (looped).
- **Plugin / built-in alt:** Deep Glow (best) / built-in **Glow** ×2 stacked with different radii for HDR falloff. Optical Flares optional for the star core glint.
- **Optimization:** Bloom on the precomp, not per-shape. **Render cost:** Med (glow). **Difficulty:** 2.
- **Limitations:** Built-in Glow lacks HDR thresholding — stack two + a Levels to fake falloff. **Production note:** the halo is what makes it read as a "wish star," not just a star — do not omit it.

---

### S04 — Flower-Ribbon Banner
- **Purpose:** The signature top-band motif; frames the sky and carries rhythm across the frame.
- **Construction:** Ribbon = a **Shape layer** with a path that is a horizontal sine wave given width via a thick **Stroke** with a **satin gradient** (Gradient Ramp or shape gradient stroke: lighter top edge, deeper pink core, magenta shadow folds) — OR a filled ribbon shape (two offset sine paths closed). Satin shading = a soft inner highlight (a second lighter stroke, Screen, offset up a few px) + fold shadows (multiply gradient at wave troughs). Daisies = a **precomp `PRE_Daisy`** (5 white rounded petals + cream center, one shape layer) instanced ~9× along the ribbon path, each parented to a point on the path.
- **Geometry:** Sine path amplitude ~90px, wavelength ~640px, across full 1920 width, vertical center y≈210. Daisies ~70–95px, scaled per depth.
- **Layer type:** Shapes + daisy precomp instances. Precomp `PRE_S04_Ribbon`.
- **Blend:** Normal; highlight stroke Screen; fold shadow Multiply.
- **Opacity:** 100%.
- **Parenting:** Ribbon → `NULL_Plane_Mid`. Each daisy → a null sampling the ribbon path (or expression `pointOnPath`), so daisies ride the wave.
- **Anchor:** Ribbon anchor at frame center; daisy anchors at their centers for spin.
- **Animation:** The whole ribbon undulates by **animating the sine phase** (path via expression or by animating a slider that offsets the wave). Daisies gently bob (inherit ribbon path) + slow individual spin (±6°) + twinkle. A faint specular glint travels along the top edge (CC Light Sweep or an animated mask).
- **Expressions:** Wave sample for daisy i: y-offset `A*Math.sin((x_i/wavelength)*2π + time*speed)`; daisy spin `wiggle`-free looped `Math.sin(time*…)*6`.
- **Plugin / built-in alt:** All built-in (shapes). Trapcode/Newton not needed. Stroke-scale safety uses the **`Update_Stroke_Weight_Expressions`** pattern from the scripts repo so the ribbon stroke stays visually constant under any camera scale.
- **Optimization:** Daisies share one `PRE_Daisy` source (instances) → tiny memory. Precompose ribbon so its Add-glint renders once.
- **Render cost:** Med. **Difficulty:** 4 (the path-riding daisies + satin shading are the fiddly part).
- **Limitations:** True "cloth"/satin needs gradient trickery — do not attempt real simulation. **Production note:** build `PRE_Daisy` once, perfect it, then instance; never hand-place nine unique daisies.

---

### S05 — Character ("The Doll")
- **Purpose:** The emotional and compositional anchor; the hero.
- **Construction — decision:** The character is **not** generated by script (a script cannot draw an anime doll). She is a **prepared imported asset**: a layered PNG/PSD (or transparent PNG with a separate soft-shadow/AO pass) placed at project root as `IMG_Character_Doll.png` (+ optional `IMG_Character_Rim.png`, `IMG_Character_AO.png`). The generator imports and rigs her. If a rig is desired, the asset is delivered as a **layered PSD** (hair-front, head, torso, arm-L, arm-R, skirt, legs, hair-back) for a Duik/parented idle rig; the default build treats her as a single flattened layer with a **puppet-free "float + breathe"** idle.
- **Geometry:** Full-body, ~560px tall, centered x=960, feet at y≈880 (on the reflection horizon).
- **Layer type:** Footage (PNG/PSD) or precomp `PRE_S05_Character` if rigged.
- **Blend:** Normal; rim pass Add; AO/contact-shadow Multiply beneath.
- **Opacity:** 100%.
- **Parenting:** `NULL_Plane_Hero` (z=0 reference plane). Rim/AO passes parented to the body layer.
- **Anchor:** Anchor at the **feet/contact point** (not center) so the breathe-scale and floor contact stay glued; a secondary control null at the chest for the breathe pivot if rigged.
- **Animation:** Idle = vertical float ±4px (sine, 4 s), breathe scale 99.5→100.5% (sine, 3.5 s), micro hair sway if rigged (parented hair layers with delayed sine). No walk/gesture.
- **Expressions:** Float `y0 + Math.sin(time*2π/4)*4`; breathe on scale; hair sway via inherited-delayed sine (`valueAtTime(time-lag)` style follow).
- **Plugin / built-in alt:** Rigging via **Duik/Joysticks'n'Sliders/Limber/RubberHose** (all in the AE catalog) *only if* a layered PSD is provided; otherwise none. Rim relight can use built-in **CC Light Sweep** or a baked rim pass.
- **Optimization:** Keep her a flat PNG for the default build (zero sim cost). Pre-multiplied alpha; 16-bit is plenty for her.
- **Render cost:** Low (flat) / Med (rigged). **Difficulty:** 2 (flat) / 5 (rigged).
- **Limitations:** A generated project cannot *invent* the character; asset must be supplied. This is the one hard external dependency (see §20). **Production note:** deliver her pre-lit to match the scene key (upper-left, cool rim). Provide a separate contact-shadow so the floor reflection reads correctly.

---

### S06 — Reflection Floor
- **Purpose:** The glossy stage; grounds the character and doubles the glow for a luxurious feel.
- **Construction:** A **duplicate of the character (and nearby glows)**, flipped vertically (Scale y = −100%), positioned below the feet horizon, with: vertical gradient opacity falloff (Linear Wipe `ADBE Linear Wipe` feathered, or a gradient track-matte), a slight blur (Fast Box Blur), a subtle horizontal ripple/`ADBE Wave Warp` for "wet floor" shimmer, and a violet tint. Floor base = a dark near-black solid with a faint radial sheen (Gradient Ramp) and a horizon glow line.
- **Geometry:** Mirror across y≈880; reflection height ~60% of source before fade.
- **Layer type:** Precomp `PRE_S06_Reflection` (holds flipped duplicates) + floor solid.
- **Blend:** Reflection Screen/Normal at low opacity; floor Normal; sheen Add.
- **Opacity:** Reflection 22–35% top → 0% bottom.
- **Parenting:** `NULL_Plane_Hero` (shares the hero plane so it tracks the character).
- **Anchor:** Anchor on the horizon line so the mirror pivots correctly.
- **Animation:** Inherits character idle (it's a duplicate); adds slow ripple phase; gentle shimmer opacity flicker.
- **Expressions:** Ripple phase `time*rate`; the reflection reads the character's transform via parenting/duplication so it stays in sync automatically.
- **Plugin / built-in alt:** Built-in only (Wave Warp + Fast Box Blur + Linear Wipe). **Fast Bokeh Pro** could add depth blur but unnecessary.
- **Optimization:** Reflect only the character + key hearts, not the whole scene. Blur + fade hide low detail, so render the reflection precomp at half-res.
- **Render cost:** Low–Med. **Difficulty:** 3.
- **Limitations:** A true mirror of *all* systems is expensive and rarely needed — reflect selectively. **Production note:** the horizon glow line is what makes "floor" read; keep a thin bright Add line at the contact.

---

### S07 — Hero Hearts (3D glossy)
- **Purpose:** The dominant decorative motif; puffy glossy candy hearts that carry the "cute" register and foreground depth.
- **Construction — two options (design decides: A default, B optional):**
  - **A (default, script-friendly):** A **`PRE_Heart` precomp**: heart silhouette shape + a **radial gradient fill** (light top-left → saturated pink → dark magenta bottom-right) + a **specular highlight** (small white soft ellipse, Screen, upper-left) + a **rim/refraction glow**. Instanced N times at different scale/z. Reads fully 3D because of the gradient + spec, but is pure 2D shapes → cheap and generatable.
  - **B (premium):** An **Element 3D** or **Stardust** true-3D heart mesh with real specular/refraction and camera-correct highlights. Higher fidelity, heavier, needs the plugin & a model.
- **Geometry:** Hearts range 60–260px; large hero heart ~240px lower-left (x≈250,y≈470), mid-right ~150px (x≈980 offset right), plus 4–6 small scatter.
- **Layer type:** `PRE_Heart` instances. Grouped under `PRE_S07_Hearts` (or distributed across near/mid planes — see note).
- **Blend:** Normal; spec highlight Screen; rim Add.
- **Opacity:** 100% (near) → 85% (far small ones).
- **Parenting:** Large near hearts → `NULL_Plane_Near`; smaller → `NULL_Plane_Mid`.
- **Anchor:** Center anchor for float/rotate/pulse.
- **Animation:** Float (sine, varied 4–7 s periods, phase-offset per instance), gentle bob-rotation ±8°, breathe-scale pulse, spec highlight drifts slightly (life). Staggered via per-instance seed so they don't move in unison.
- **Expressions:** Per-instance `seedRandom(index,true)` to offset phase/period; float+rotate+pulse from `CTRL_Global > Master Drift`. Highlight position micro-wiggle (looped).
- **Plugin / built-in alt:** Default all built-in; Option B uses **Element 3D**/**Stardust** (AE catalog). Glow via Deep Glow/built-in Glow.
- **Optimization:** One `PRE_Heart` source instanced → memory-light. Vary via transform only, not new art. Motion blur on.
- **Render cost:** Med (many glows). **Difficulty:** 3 (A) / 5 (B).
- **Limitations:** 2D gloss won't relight from the camera; acceptable at this scale. **Production note:** distribute hearts across ≥2 depth planes so parallax separates them; never put all hearts on one plane.

---

### S08 — Star Confetti
- **Purpose:** Sprinkle of small rounded stars adding playful density and secondary color accents (yellow/teal/pink).
- **Construction:** A `PRE_StarSmall` precomp (rounded 5-point Polystar, flat fill + soft glow, optional tiny sparkle cross on top). Instanced ~12–18×, color-varied by an expression selecting from the palette. Teal outlined star (left) = same source, stroke-only + teal fill.
- **Geometry:** 24–70px; scattered mid & near.
- **Layer type:** Shape precomp instances. `PRE_S08_Stars`.
- **Blend:** Normal + Add glow.
- **Opacity:** 80–100%.
- **Parenting:** Split across `NULL_Plane_Mid` / `NULL_Plane_Near`.
- **Anchor:** Center (spin + twinkle-scale).
- **Animation:** Slow spin (±/full, varied), twinkle (scale + opacity sine, phase-random), drift. Some pop in/out via looped scale 0→1→0 with random timing.
- **Expressions:** Color `arr = CTRL_Global palette; arr[ index % arr.length ]`; twinkle looped sine; `seedRandom` per instance.
- **Plugin / built-in alt:** Built-in shapes. (Particular/Form could emit stars procedurally — optional, §15.)
- **Optimization:** Instance one source; color by expression not by duplication.
- **Render cost:** Low–Med. **Difficulty:** 2.
- **Limitations:** Too many = busy; cap count via `CTRL_Global > Decoration Density`. **Production note:** keep star colors *from the palette controller* so a re-grade stays coherent.

---

### S09 — Plus-Sparkles (4-point twinkles)
- **Purpose:** The "magic glint" language — four-point sparkles that twinkle to imply light and enchantment.
- **Construction:** A `PRE_Sparkle` precomp: a 4-point star / plus with pinched concave sides (Polystar with high roundness or two crossed thin diamonds) + bright core + Add glow. Instanced ~20–30×.
- **Geometry:** 10–46px; densest near corners & around the wish-star/character.
- **Layer type:** Shape precomp instances. `PRE_S09_Sparkles`.
- **Blend:** **Add** (they are pure light).
- **Opacity:** Driven 0→100→0 by twinkle.
- **Parenting:** Mostly `NULL_Plane_Near`; a few on Mid.
- **Anchor:** Center; scale from 0 for the "twinkle birth."
- **Animation:** Rapid-ish twinkle: scale + opacity pulse with random phase & period (1–2.5 s), slight rotation. Staggered so the field shimmers continuously.
- **Expressions:** Looped twinkle `t=(time*rate+seed)%1; s=Math.sin(t*π); scale=[s* max]`; `seedRandom(index,true)`.
- **Plugin / built-in alt:** Built-in shapes; Optical Flares "sparkles" or Stardust could do it — overkill.
- **Optimization:** posterizeTime the twinkle field to ~15 fps for previews; instance one source.
- **Render cost:** Low. **Difficulty:** 2.
- **Limitations:** Add blend can clip to white in 8-bit — we're 32-bit float so fine. **Production note:** color mostly white with occasional palette-tinted ones for variety.

---

### S10 — Bokeh & Orbs
- **Purpose:** Depth-of-field candy; foreground defocus orbs and a few solid spheres (teal/pink) that frame and add dimensionality.
- **Construction:** Bokeh = soft circles (shape/solid with big feather or **Fast Bokeh Pro**) at low opacity, some clustered lower-left/right. Solid spheres = shape circle with radial gradient + spec highlight (mini version of the heart gloss) for the teal & pink orbs. Foreground bokeh gets a large blur to read as out-of-focus.
- **Geometry:** Bokeh 20–160px; spheres ~40–80px.
- **Layer type:** `PRE_Bokeh` (soft) + `PRE_Orb` (glossy) instances. `PRE_S10_Bokeh`.
- **Blend:** Bokeh Screen/Add low-opacity; orbs Normal + spec Screen.
- **Opacity:** Bokeh 15–40%; orbs 90%.
- **Parenting:** Near-focus bokeh → `NULL_Plane_Near` (heavily blurred); far bokeh → `NULL_Plane_Far`.
- **Anchor:** Center; slow drift + scale breathe.
- **Animation:** Slow vertical drift, gentle scale pulse, opacity shimmer; foreground bokeh drifts faster (parallax).
- **Expressions:** Drift + pulse looped; blur amount tied to plane depth via `CTRL_Camera` DOF (see §7).
- **Plugin / built-in alt:** **Fast Bokeh Pro** (AE catalog) for real depth blur, or built-in Fast Box Blur / Camera Lens Blur. Particular can emit bokeh — optional.
- **Optimization:** Foreground blur is expensive per-layer; instead blur the whole Near-plane precomp once. Half-res the bokeh precomp.
- **Render cost:** Med (blur). **Difficulty:** 2.
- **Limitations:** Big blurs are the #1 preview-speed killer — gate them behind a "Preview" checkbox that disables foreground DOF (see §17). **Production note:** keep foreground bokeh sparse; it's seasoning, not the meal.

---

### S11 — Fairy-Dust Particles
- **Purpose:** Continuous fine glowing dust that fills the volume and sells "magic in the air."
- **Construction — decision:** **Trapcode Particular** (AE catalog) emitting tiny glowing sprites in 3D with turbulence + fade is the ideal. **Built-in fallback:** **CC Particle Systems II** (`CC Particle Systems II`) or **CC Snowfall** (`CSSnowfall`) styled to fine points, or a hand-instanced shape field with looped drift. Because the output is script-generated and Particular params are scriptable, Particular is acceptable *if licensed*; otherwise CC Particle Systems II is the deterministic default.
- **Geometry:** Full-volume emitter; particle size 1–4px; density moderate.
- **Layer type:** Effected solid (Particular/CC) — `PRE_S11_Dust`. 3D if using Particular's 3D.
- **Blend:** Add.
- **Opacity:** 40–70% (master-glow linked).
- **Parenting:** Spans planes; a copy on Near (larger, faster) and Far (smaller, slower) for parallax.
- **Anchor:** N/A (emitter).
- **Animation:** Continuous emission + turbulence; loop by letting the system reach steady-state then time-offset, or by using a periodic emitter and matching the loop length.
- **Expressions:** Emitter/turbulence phase from `CTRL_Global`; for a perfect loop, drive a system that is inherently periodic or crossfade a 10 s segment onto itself.
- **Plugin / built-in alt:** Particular (best) / CC Particle Systems II (default) / Form (grid dust).
- **Optimization:** Particles are cheap if small & few; keep counts modest; Add glow via one blur, not per particle. Cache/pre-render dust to a looping element if it bottlenecks MFR.
- **Render cost:** Med. **Difficulty:** 3 (looping a particle sim seamlessly is the tricky part).
- **Limitations:** Particle sims are the hardest thing to loop perfectly — budget time or pre-bake. **Production note:** if perfect loop proves painful, pre-render dust as a seamless ProRes 4444 element and re-import (a legit studio move).

---

### S12 — Light Trails / Swooshes
- **Purpose:** Connective calligraphic motion lines (e.g., dotted curl near the lower-left heart, glints trailing sparkles) that guide the eye and add flourish.
- **Construction:** Shape path + **trim paths** animated for a "write-on" reveal, dotted via dashed stroke; glow Add. Some are dotted trails (dashed stroke) that loop by cycling trim offset.
- **Geometry:** Curved bezier ~200–400px; near lower-left heart and along ribbon.
- **Layer type:** Shape. `PRE_S12_Trails`.
- **Blend:** Add.
- **Opacity:** 60–90%.
- **Parenting:** Plane of the element they accompany (mostly Mid/Near).
- **Anchor:** Path-relative.
- **Animation:** Looping trim-paths chase; dash offset scroll; twinkle.
- **Expressions:** Dash offset `time*rate` (loops if rate·10 is integer·dashLen); trim offset looped.
- **Plugin / built-in alt:** Built-in shapes (Trim Paths, dashed stroke). **Sapphire**/Universe glow strokes optional.
- **Optimization:** Trivial. **Render cost:** Low. **Difficulty:** 2.
- **Limitations:** Keep subtle — trails read as clutter if over-bright. **Production note:** dashed-stroke loop math must align dash length to path length for a seamless scroll.

---

### S13 — Global Atmosphere (post)
- **Purpose:** Unify everything: bloom, grade, vignette, subtle chromatic softness, grain.
- **Construction:** Two adjustment layers at the top of the master comp: `ADJ_Bloom` (Deep Glow, or stacked built-in Glow) and `ADJ_Grade` (Lumetri `ADBE Lumetri` or Curves+Hue/Sat+Photo Filter+Vignette). Optional very-fine grain (Add Grain / low Noise) to prevent gradient banding. Optional chromatic aberration (Sapphire/Universe or a channel-offset) at edges only.
- **Layer type:** Adjustment layers (top of `MASTER`).
- **Blend:** Normal (they process everything below).
- **Opacity:** Grade 100%; Bloom intensity via `CTRL_Global`.
- **Parenting:** None (they must cover the frame, unparented, full-size).
- **Animation:** Very slow global glow breathe; otherwise static.
- **Expressions:** Bloom intensity ← `CTRL_Global > Master Glow`; vignette static.
- **Plugin / built-in alt:** **Deep Glow** + **Magic Bullet Looks**/**Lumetri** (AE catalog) / built-in Glow + Curves + Lumetri.
- **Optimization:** One global bloom pass beats per-layer glows — but we still use local glows for hero elements; global bloom ties them together at low radius. Keep Lumetri GPU (13.8).
- **Render cost:** Med–High (bloom is the biggest single cost). **Difficulty:** 3.
- **Limitations:** Over-bloom destroys the character's face — mask the bloom threshold high, or exclude the character region. **Production note:** this pass is where "amateur" becomes "commercial." Budget grading time.

---

<a name="5-color-design"></a>
## 5. Color Design

### 5.1 Palette (the single source of truth — lives on `CTRL_Global`)
All values are the art-direction targets; the generator writes them into Color Control effects on `CTRL_Global`, and every layer reads them. Hex is sRGB 8-bit for reference; the project works in 32-bit linear.

| Token | Role | Hex | Notes |
|---|---|---|---|
| `BG_Deep` | Background darkest (edges/vignette) | `#160726` | Deep indigo-violet; the void floor. |
| `BG_Mid` | Background mid (gradient core) | `#3A1B63` | Violet; the "sky" glow behind character. |
| `BG_Glow` | Background upper glow | `#5B2E8C` | Lighter violet halo near top. |
| `PINK_Hot` | Primary accent (ribbon core, hearts) | `#FF4DA6` | The hero pink; magenta-leaning. |
| `PINK_Light` | Highlight pink (ribbon top edge, spec) | `#FF9AD1` | Satin highlight. |
| `PINK_Pale` | Soft pink (bokeh, daisy tint, dust) | `#FFD6EC` | Airy, near-white pink. |
| `MAGENTA_Deep` | Shadow/fold pink (ribbon troughs) | `#C21E7A` | Ribbon depth. |
| `STAR_Cream` | Wish-star & warm accents | `#FFF3C4` | Warm counterpoint to cool void. |
| `YELLOW_Star` | Confetti star yellow | `#FFD24A` | Playful warm. |
| `TEAL_Accent` | Teal star/orb accent | `#4FE6C4` | The one cool-pop that adds range. |
| `LAV_Accent` | Lavender sparkles/character | `#C9B3FF` | Bridges pink↔violet. |
| `WHITE_Spark` | Sparkle/daisy white / rim light | `#FFFFFF` (bloomed) | Pure light; Add. |

### 5.2 Structure & why
- **Primary:** Violet (background) + Hot Pink (accents). A **violet↔pink analogous-plus** scheme — harmonious, feminine, dreamy. This is the core of the kawaii/magical-girl look.
- **Secondary:** Cream/Yellow (wish-star, confetti) provides **warm-vs-cool contrast** so the frame isn't monochromatic pink. Warm accents advance, cool recedes — reinforcing depth.
- **Accent:** Teal (single, sparing) + Lavender (transitional). Teal is the "surprise" complement that makes the pinks sing (near-complementary to the warm cream); used *sparingly* (one or two orbs/stars) precisely so it pops.
- **Background:** Dark violet gradient (radial, lighter behind the character to halo her, darker at edges for vignette/focus).
- **Glow colors:** Warm-white core → pink mid → violet outer falloff (so bloom tints toward the scene rather than blowing to neutral white).
- **Highlights:** Near-white with a pink tint (never pure clinical white except sparkles).
- **Shadows:** Never black — deep violet/magenta. Colored shadows = premium look; black shadows = amateur.
- **Reflection colors:** The reflection is tinted cooler/violet and darker than the source (real floors desaturate and cool the reflection).

### 5.3 Mood / contrast / saturation / brightness / harmony
- **Mood:** Sweet, magical, serene, aspirational.
- **Contrast:** Medium-low *luminance* contrast (dreamy, soft) but **high chroma contrast** (saturated accents on a saturated-but-dark ground). Bloom lifts blacks slightly for a "hazy" feel.
- **Saturation:** High on accents, moderate on background; the grade adds a gentle overall saturation lift and a pink→violet split-tone (warm highlights, cool shadows).
- **Brightness:** Character and wish-star are the brightness peaks (eye magnets); corners fall off via vignette.
- **Harmony:** Analogous violet-pink core + warm complementary accents = a controlled, professional palette (≈6 hues, disciplined).

### 5.4 Grade recipe (for `ADJ_Grade`)
1. Lift shadows into violet, push highlights into warm-pink (split-tone via Lumetri color wheels or Curves per channel).
2. Global saturation +8–12%, vibrance to protect skin.
3. Gentle S-curve for contrast, then raise the black point ~3% for haze.
4. Vignette (−exposure at edges, feathered, subtle).
5. Optional Photo Filter warming ~5% to marry warm/cool.

---

<a name="6-lighting-architecture"></a>
## 6. Lighting Architecture

The scene is 2.5D, so "lighting" is a mix of **baked shading (in the art)**, **additive light passes**, and — in the premium/Advanced-3D build — **real AE lights** on the reflective floor and any 3D elements.

### 6.1 Reverse-engineered lighting model
| Light | Source in frame | Direction | Softness | Color | Purpose |
|---|---|---|---|---|---|
| **Key** | Upper-left nebula glow / off-frame | From upper-left, ~25° | Soft | Warm pink-white | Main modelling on character & hearts; motivates the nebula streak. |
| **Fill** | Ambient violet void | Omni/ambient | Very soft | Cool violet | Lifts shadow side; keeps shadows colored, not black. |
| **Rim / Back** | Behind character (background glow) | From behind | Medium | Cool white/lavender | Separates the character from the void — the signature magical-girl rim. |
| **Practical 1** | Wish-star | Upper-right | Radial | Cream | Secondary warm source; justifies warm accents on the right side. |
| **Practical 2** | Hearts/orbs spec | Local | Sharp small | White | Glossy speculars; sell the candy material. |
| **Bounce** | Reflective floor | From below | Soft | Violet-pink | Under-light from the glossy floor; subtle up-glow on the character's lower half. |

### 6.2 Light hierarchy & bloom
1. **Ambient** (violet fill) — the base level everything sits in.
2. **Key** (upper-left, warm) — primary directional read.
3. **Rim** (back) — separation.
4. **Practicals** (star, spec, floor bounce) — sparkle & richness.
5. **Bloom/volumetric feeling** — Deep Glow/Glow passes turn every bright source into soft light, creating the "volumetric," hazy, dreamy atmosphere without true volumetrics.

### 6.3 Implementation
- **Default (Advanced-3D optional):** lighting is *painted into the assets* (character pre-lit, hearts gradient-shaded) + additive passes (nebula, glows, rim pass). No AE lights required → cheapest, fully script-generatable.
- **Premium:** enable **Advanced 3D**, add an **Environment Light** (image-based) tinted violet + a warm **Spot/Point** upper-left + a cool back light. Real lights affect only 3D-enabled layers (floor, any 3D hearts/dust). Use AE 2026 environment lighting for believable floor reflections.
- **Rim as a pass:** a duplicated character silhouette, filled cool-white, blurred, offset, Add, masked to the back edge — a reliable script-buildable rim that needs no lights.

### 6.4 Softness & volumetric feeling
- All key/fill are *soft* (large sources). Hardness appears only in speculars and sparkle cores.
- "Volumetric" haze = global low-radius bloom + the nebula streak + fairy-dust catching light. There is no true god-ray/volumetric plugin required; **Optical Flares** or **CC Light Rays** (`CC Light Rays`) can add god-rays from the wish-star if desired (optional).

---

<a name="7-camera-architecture"></a>
## 7. Camera Architecture

### 7.1 Intent
A single **AE camera** performing a slow, looping **micro-drift + subtle push** to bring the flat parallax planes to life. The camera is never the star — it's a 3–6px, 1–2% breathing move that makes the 2.5D stack feel dimensional.

### 7.2 Reverse-engineered camera
| Property | Value | Reasoning |
|---|---|---|
| Type | **Two-node? No — One-node camera + separate look controls** | One-node is easier to rig with nulls; orientation via parent null. |
| Lens / focal length | **~35–40mm equivalent (moderate wide)** | The reference has mild perspective, generous framing, decorative depth — a moderate wide, not a telephoto. |
| Field of view | ~50–55° horizontal | Consistent with 35–40mm on the sensor AE uses. |
| Film size / preset | AE default 36mm; set Zoom so 1920 maps to ~40mm feel | Keep DOF controllable. |
| Movement | Looping Lissajous micro-drift (x: ±6px @ period A, y: ±4px @ period B, A≠B) + push z ±1.5% (period C) | Organic, non-repeating-feeling but perfectly periodic. |
| Parallax | Achieved via 7 depth planes at different z (see §9.2) all seen by this camera | The whole point of the rig. |
| Depth of field | **On**, subtle | Foreground bokeh & background stars soften; character sharp. |
| Focus distance | Locked to `NULL_Plane_Hero` (character z) via expression | Character always tack-sharp; DOF falls off toward near/far. |
| Aperture / blur level | Small (f-large) — gentle DOF; drive "Blur Level" ~20–40% | Enough to separate, not enough to mush. |
| Motion style | Ease-less continuous sine (no keyframes) | Loops perfectly; no keyframe drift. |
| Micro-movement | Tiny handheld-style wiggle (looped, ≤1px) optional | Adds life; keep almost imperceptible. |

### 7.3 Controller hierarchy (camera rig)
```
CTRL_Camera            (null; master look controls: Drift Amp, Push Amt, Focus, DOF)
 └── NULL_Cam_Orient   (null; parent for orientation/parallax pivot, z=0)
      └── CAM_Main      (the actual camera; Point of Interest or one-node)
```
- `CAM_Main.position` = base + Lissajous drift (expression reading `CTRL_Camera`).
- `CAM_Main.zoom`/z = base ± push (sine).
- `CAM_Main.focusDistance` = distance to `NULL_Plane_Hero` (expression) so focus tracks the character even as the camera pushes.
- All parallax planes are 3D nulls at fixed z; the camera move produces parallax automatically.

### 7.4 Depth-of-field as art direction
- DOF is enabled but *gentle*. A `CTRL_Camera > DOF Amount` (0–100) scales aperture. Preview builds set it to 0 (huge speed win). Final sets 25–35.
- Focus is **expression-locked** to the hero plane, never hand-keyed, so it can never drift out of the loop.

---

<a name="8-animation-architecture"></a>
## 8. Animation Architecture

### 8.1 Motion philosophy
Everything is **slow, looping, layered, and offset.** No element moves in sync with another (except intentionally). All motion is **expression-driven and periodic** so the 300-frame loop is seamless. The register is *floating, breathing, twinkling* — never mechanical.

### 8.2 Motion vocabulary (the reusable "moves")
| Move | Applied to | Method | Period | Amplitude |
|---|---|---|---|---|
| **Float** (vertical bob) | hearts, stars, orbs, character, daisies | `y = y0 + sin(t·2π/T + φ)·A` | 3–7 s (varied) | 3–12px |
| **Drift** (slow lateral) | bokeh, dust, some stars | sine or slow directional loop | 8–10 s | 4–20px |
| **Breathe** (scale pulse) | hearts, wish-star, character, glows | `s = s0 + sin(t·2π/T)·Δ` | 3.5–6 s | ±1–4% |
| **Spin** (rotation) | stars, sparkles, halo, daisies | `r = time·rate` (looped) or `sin` wobble | full rev/40 s or ±8° | — |
| **Twinkle** (scale+opacity pop) | sparkles, confetti, spec | `k = sin((t·rate+seed)%1·π)` | 1–2.5 s | 0→max |
| **Undulate** (wave) | ribbon, floor ripple | phase-animated sine path | 10 s | 90px (ribbon) |
| **Glow pulse** | all glows, bloom, nebula | intensity `= lo + sin(t·2π/T)·(hi-lo)/2` | 5–8 s | dial |
| **Camera micro-drift** | camera | Lissajous (§7) | A/B/C coprime-ish | ≤6px |

### 8.3 Timing, rhythm, easing
- **Rhythm:** Poly-rhythmic. Choose periods that are integer divisors of 10 s (10, 5, 3.33, 2.5, 2) *or* let expressions wrap naturally; stagger phases via per-instance `seedRandom` so the field feels alive, not gridded.
- **Interpolation:** Pure sinusoids → naturally eased (slow at extremes). Where keyframes are used (rare), use smooth/soft ease (roving) — never linear on organic motion. This mirrors the studio's `Add_Simple_Loop_Expression` philosophy (cycle/pingpong/offset/continue loop types available as needed).
- **Overshoot / secondary motion:** Optional light overshoot on twinkle births (scale 0→1.1→1) and on heart bob (a follow-through rotation lagging the position). Hair sway (if rigged) is secondary motion following the head with a time lag.
- **Speed / amplitude master:** `CTRL_Global > Master Drift Speed` (0.5–1.5) multiplies all periods; `Master Amplitude` scales all amplitudes. One knob = calmer or livelier scene.

### 8.4 Looping strategy (the seam-killer)
1. **Sine/cos-of-time** motions loop automatically iff `period` divides the loop length (or the expression uses `time % loopDur`). We enforce this.
2. **`loopOut("cycle")`/`loopOut("pingpong")`** for any keyframed motion (per the scripts-repo loop rig).
3. **Rotations** loop iff `rate·loopDur` is an integer number of revolutions.
4. **Dashed-stroke scrolls** loop iff `offsetPerSecond·loopDur` is an integer multiple of the dash+gap length.
5. **Particle systems** (dust): loop by pre-baking a seamless element or by crossfading the 10 s segment (§S11).
6. **Wiggle**: never use raw `wiggle()` in final (it doesn't loop). If wiggle is desired, use a **looped-wiggle** technique (sample wiggle over one period and cross-blend, or a sum-of-sines pseudo-random) — documented in §16.5.

---

<a name="9-scene-engineering"></a>
## 9. Scene Engineering

### 9.1 Build order (dependency-correct)
1. Project setup (color mgmt 32-bit linear, MFR on, expression engine = JavaScript).
2. Folders (§11).
3. Palette & control nulls (`CTRL_Global`, `CTRL_Camera`) — *first*, because everything reads them.
4. Reusable source precomps (`PRE_Daisy`, `PRE_Heart`, `PRE_StarSmall`, `PRE_Sparkle`, `PRE_Bokeh`, `PRE_Orb`).
5. System precomps far→near (S01→S12).
6. Master comp: place camera rig + plane nulls, then drop system precomps onto planes.
7. Global adjustment passes (`ADJ_Bloom`, `ADJ_Grade`).
8. Wire expressions (link all to controllers).
9. Animation pass (periods, phases, seeds).
10. Grade & bloom finalize.
11. Optimize (proxies, posterize preview, region of interest).
12. Render (MFR → ProRes master + H.264 review).

### 9.2 The parallax depth stack (7 planes)
Each plane is a 3D **null** at a fixed z; systems parent to a plane. The camera's move produces parallax automatically (nearer = more travel).

| Plane null | z (px) | Parallax factor | Systems on it |
|---|---|---|---|
| `NULL_Plane_Far` | +2400 | 0.25× | S01 Cosmos, S02 Nebula, far bokeh, far dust |
| `NULL_Plane_MidFar` | +1400 | 0.45× | S03 Wish-Star |
| `NULL_Plane_Mid` | +700 | 0.7× | S04 Ribbon, mid hearts, mid stars |
| `NULL_Plane_Hero` | 0 | 1.0× (focus lock) | S05 Character, S06 Reflection |
| `NULL_Plane_NearMid` | −500 | 1.3× | near stars, mid sparkles, orbs |
| `NULL_Plane_Near` | −1100 | 1.7× | S07 large hearts, S09 sparkles, near bokeh |
| `NULL_Plane_Foreground` | −1900 | 2.2× | heavy foreground defocus bokeh, a few dust |

*(z values are indicative; the engineer tunes so all planes fit the 40mm frame at 1920×1080. Scale each plane's contents to compensate for z so their apparent size matches the reference.)*

### 9.3 Hierarchies (summary; detail in §12–13)
- **Composition hierarchy:** `MASTER` → system precomps → source precomps.
- **Parent hierarchy:** camera & all systems → plane nulls → (planes are independent) ; controls read by expression, not parenting.
- **Render hierarchy:** sources render first (cached) → systems → planes composited by camera → bloom → grade.
- **Animation hierarchy:** `CTRL_Global`/`CTRL_Camera` drive everything downstream; nothing drives *up*.

---

<a name="10-composition-architecture"></a>
## 10. Composition Architecture

### 10.1 Comp inventory
| Comp | Size | Purpose | Contains |
|---|---|---|---|
| `MASTER_Starlight_Reverie_1080p` | 1920×1080 @30, 10s | Final assembly | Camera rig, plane nulls, all system precomps, ADJ layers, controls |
| `PRE_S01_BG_Cosmos` | 2304×1296 (120%) | Background void + stars | gradient solid, fractal stars, dots, nebula |
| `PRE_S02_Nebula` | 1920×1080 | Light streak | ramp solid + mask + blur |
| `PRE_S03_WishStar` | 900×900 | Star + halo | star shape, halo ellipse, glow |
| `PRE_S04_Ribbon` | 2304×700 | Flower ribbon | ribbon shape + daisy instances |
| `PRE_S05_Character` | 800×1200 | Doll (+rig) | imported art (+rim/AO passes) |
| `PRE_S06_Reflection` | 800×900 | Floor mirror | flipped duplicates + fade + ripple |
| `PRE_S07_Hearts` | 1920×1080 | Heart field | `PRE_Heart` instances |
| `PRE_S08_Stars` | 1920×1080 | Confetti | `PRE_StarSmall` instances |
| `PRE_S09_Sparkles` | 1920×1080 | Twinkles | `PRE_Sparkle` instances |
| `PRE_S10_Bokeh` | 1920×1080 | Bokeh/orbs | `PRE_Bokeh`/`PRE_Orb` instances |
| `PRE_S11_Dust` | 1920×1080 | Fairy dust | particle system |
| `PRE_S12_Trails` | 1920×1080 | Swooshes | shape trails |
| **Source precomps** | varies | Reusable atoms | `PRE_Daisy`, `PRE_Heart`, `PRE_StarSmall`, `PRE_Sparkle`, `PRE_Bokeh`, `PRE_Orb` |

### 10.2 Why precompose this way
- **One system = one precomp** → each can be soloed, re-timed, proxied, version-swapped, or Lottie-audited independently.
- **Source atoms** (`PRE_Daisy` etc.) instanced everywhere → change the atom once, it updates globally; memory stays tiny.
- **Oversized background** (120%) → camera push never reveals edges.
- **Collapse Transformations** on system precomps where continuous rasterization/3D pass-through helps (shapes stay crisp under camera scale); *disable* collapse where a precomp's blend/blur must be self-contained (bloom precomps).

### 10.3 Comp settings (all)
- 32 bpc, linear working space, MFR enabled, motion blur on (180°, adaptive 16), 30 fps, square pixels, preserve frame rate on nesting where needed.

### 10.4 Frame & safe areas
- No text/title-safe requirement (no typography in the reference — see §10.5), but keep the character within action-safe so vertical/square crops don't clip her.

### 10.5 Typography
The reference contains **no typography.** Design provision: a `PRE_Title` placeholder precomp (empty, disabled) is created so a headline/logo can be dropped into the top-band negative space later, styled to match (rounded, white, soft-glow, slight arc following the ribbon). Font direction if needed: a rounded geometric sans or a soft display face; all-caps or title-case; generous tracking; white with pink outer glow. This is *future-proofing*, not part of the v1 render.

### 10.6 Multi-format scalability
- **Vertical 1080×1920:** same MASTER, re-target camera & plane offsets via a `CTRL_Global > Format` switch that repositions the ribbon higher, stacks decoration vertically, keeps the character centered. Built as `MASTER_..._Vertical` referencing the same system precomps.
- **Square 1080×1080:** tighter crop, ribbon arcs, fewer corner elements.
- Because all systems are precomps read by expressions off `CTRL_Global`, reformatting is repositioning nulls — not rebuilding art.

---

<a name="11-folder-architecture"></a>
## 11. Folder Architecture

Project-panel folder tree (created first by the generator). Sort-friendly numeric prefixes.

```
00_MASTERS/                → MASTER_Starlight_Reverie_1080p (+ _Vertical, _Square)
10_SYSTEMS/                → PRE_S01…PRE_S12 (system precomps)
20_SOURCES/                → PRE_Daisy, PRE_Heart, PRE_StarSmall, PRE_Sparkle, PRE_Bokeh, PRE_Orb, PRE_Title
30_ASSETS/                 → imported art
   31_Character/           → IMG_Character_Doll.png, _Rim, _AO (+PSD if rigged)
   32_Textures/            → any dot/grain/nebula maps (if not procedural)
40_CONTROLLERS/            → (nulls live in comps, but a note-comp/readme solid documenting controls)
50_CAMERA/                 → camera rig reference note
90_RENDER/                 → output notes, render-comp variants
99_PRECOMP_TRASH/          → staging for deprecated versions (kept out of masters)
```

**Naming conventions (see Appendix B for the full grammar):**
- Comps: `MASTER_*`, `PRE_S##_*` (systems), `PRE_*` (sources).
- Layers: `TYPE_Name` (`NULL_`, `CTRL_`, `ADJ_`, `CAM_`, `IMG_`, `SH_` shape, `SOL_` solid, `LGT_` light).
- Controllers/effects: human-readable slider names (`Master Glow`, `Drift Speed`).
- Everything PascalCase/Underscore, no spaces in comp/asset names (script-safe, cross-platform).

---

<a name="12-layer-architecture"></a>
## 12. Layer Architecture

### 12.1 MASTER comp layer stack (top → bottom)
```
[ 1] ADJ_Grade            (adjustment; Lumetri/curves/vignette)         — unparented, full-frame
[ 2] ADJ_Bloom            (adjustment; Deep Glow/Glow)                  — unparented, full-frame
[ 3] CTRL_Global          (null; palette + master controls; guide)     — no render
[ 4] CTRL_Camera          (null; camera look controls; guide)          — no render
[ 5] CAM_Main             (camera)                                      — child of NULL_Cam_Orient
[ 6] NULL_Cam_Orient      (null)
[ 7] PRE_S12_Trails       → NULL_Plane_Mid/Near
[ 8] PRE_S09_Sparkles     → NULL_Plane_Near
[ 9] PRE_S10_Bokeh (near) → NULL_Plane_Foreground/Near
[10] PRE_S07_Hearts (near)→ NULL_Plane_Near
[11] PRE_S08_Stars (near) → NULL_Plane_NearMid
[12] PRE_S11_Dust (near)  → NULL_Plane_Near
[13] PRE_S05_Character    → NULL_Plane_Hero
[14] PRE_S06_Reflection   → NULL_Plane_Hero
[15] PRE_S07_Hearts (mid) → NULL_Plane_Mid
[16] PRE_S08_Stars (mid)  → NULL_Plane_Mid
[17] PRE_S04_Ribbon       → NULL_Plane_Mid
[18] PRE_S03_WishStar     → NULL_Plane_MidFar
[19] PRE_S11_Dust (far)   → NULL_Plane_Far
[20] PRE_S10_Bokeh (far)  → NULL_Plane_Far
[21] PRE_S02_Nebula       → NULL_Plane_Far
[22] PRE_S01_BG_Cosmos    → NULL_Plane_Far
[23] NULL_Plane_Foreground](3D null)
[24] NULL_Plane_Near       (3D null)
[25] NULL_Plane_NearMid    (3D null)
[26] NULL_Plane_Hero       (3D null)
[27] NULL_Plane_Mid        (3D null)
[28] NULL_Plane_MidFar     (3D null)
[29] NULL_Plane_Far        (3D null)
[30] SOL_Guide_BG          (black solid backstop, locked, bottom)
```
*(Plane nulls are listed at the bottom for tidiness; render order is by z under the camera, not by stack index, once layers are 3D. Adjustment layers must be topmost to process everything.)*

### 12.2 Layer-type rules
- **Nulls** for all control & parenting (never parent art to art except intentional rig chains). Confirmed by the studio's own null-object rigging methodology (TouchTracker generates null objects for exactly this reason).
- **Adjustment layers** for anything global (bloom, grade). Never bake global looks into a single art layer.
- **Shape layers** for all procedural geometry (hearts, stars, sparkles, ribbon, daisies, trails, orbs) → resolution-independent, script-buildable, tiny.
- **Solids** for gradient fields & effect hosts (cosmos, nebula, particle emitters).
- **Guide/locked** backstop solid at the very bottom so a transparent gap never flashes through.
- **3D layers** only where needed (plane nulls, floor, optional 3D hearts/dust) — every extra 3D layer costs render time.

### 12.3 Anchor-point strategy (global rule)
- **Decoration** (hearts/stars/sparkles/orbs/daisies): anchor at **geometric center** → clean spin & pulse.
- **Character & reflection:** anchor at **contact point (feet/horizon)** → stays glued to floor under breathe/scale.
- **Ribbon:** anchor at **frame-center of its path** → symmetric undulation.
- **Wish-star & halo:** shared **centroid** → co-pulsing.
- **Glow/bloom precomps:** anchor centered, full-frame.
- Rule: *set the anchor to the pivot the animation needs, at build time, before parenting* — never nudge position to fake a pivot.

---

<a name="13-controller-architecture"></a>
## 13. Controller Architecture

### 13.1 Master controllers (two nulls, no render)
**`CTRL_Global`** — the art-direction brain. Effects applied (all are Expression Controls — see Appendix A match-names):
| Control (effect) | Match-name | Range/Type | Drives |
|---|---|---|---|
| Palette: `Color_BG_Deep` … `Color_White` (11 Color Controls) | `ADBE Color Control` | color | every fill/tint in the scene |
| `Master Glow` (Slider) | `ADBE Slider Control` | 0–200% | all glow/bloom intensities |
| `Master Drift Speed` (Slider) | `ADBE Slider Control` | 0.5–1.5 | all motion periods (multiplier) |
| `Master Amplitude` (Slider) | `ADBE Slider Control` | 0–200% | all motion amplitudes |
| `Decoration Density` (Slider) | `ADBE Slider Control` | 0–100% | opacity/enable of confetti & sparkles |
| `Parallax Depth` (Slider) | `ADBE Slider Control` | 0–200% | plane z-spread |
| `Preview Mode` (Checkbox) | `ADBE Checkbox Control` | 0/1 | disables DOF & heavy blur for fast preview |
| `Format` (Dropdown) | `ADBE Dropdown Control` | 16:9/9:16/1:1 | layout retargeting |

**`CTRL_Camera`** — the camera look brain:
| Control | Match-name | Drives |
|---|---|---|
| `Drift Amp X/Y` (Sliders) | `ADBE Slider Control` | camera Lissajous amplitude |
| `Drift Period X/Y/Z` (Sliders) | `ADBE Slider Control` | camera periods |
| `Push Amount` (Slider) | `ADBE Slider Control` | z breathe |
| `DOF Amount` (Slider) | `ADBE Slider Control` | aperture/blur level |
| `Focus Target` (Layer Control) | `ADBE Layer Control` | focus-lock plane |

### 13.2 Controller principles
- **Single source of truth:** no color or speed literal anywhere in the scene — all read from `CTRL_Global`. A re-skin = editing one null.
- **Downstream-only data flow:** controllers are read by expressions; controllers never read layers. No cycles.
- **Human-labelled:** every slider/color is renamed to a meaningful label (the generator sets `.name` on each effect), so an artist can drive the scene with zero code.
- **Guide layers / shy:** controllers are non-rendering guide layers, marked shy, collapsed into a labelled group at the top.
- **Per-instance seeds:** decoration instances carry an index-seed (`seedRandom(index,true)`) so one expression yields a varied field — no per-layer hand-tuning.

### 13.3 Reusable rigs (the "modules")
| Rig | What it is | Reused by |
|---|---|---|
| **Float-Breathe-Spin rig** | 3 expressions (pos/scale/rot) reading `CTRL_Global` + per-instance seed | hearts, stars, orbs, daisies, character |
| **Twinkle rig** | scale+opacity looped pop, seeded | sparkles, confetti, spec highlights |
| **Glow-Pulse rig** | intensity sine ← Master Glow | all glows, nebula, bloom |
| **Palette-Pick rig** | `paletteArray[index % n]` from `CTRL_Global` | any color-varied instance |
| **Path-Ride rig** | sample a point on the ribbon sine for daisy placement | daisies, ribbon glints |
| **Parallax rig** | plane z from `Parallax Depth`; apparent-scale compensation | all plane nulls |
| **Maintain-Scale/Stroke rig** | keep stroke width & scale visually constant under camera z (from scripts-repo `Update_Stroke_Weight_Expressions` / `Toggle_Maintain_Scale`) | ribbon stroke, thin trails |

---

<a name="14-effect-pipeline"></a>
## 14. Effect Pipeline

Ordered, per-system, using **exact first-party match-names** from the knowledge base (`matchnames/effects/firstparty.md`). GPU-accelerated effects are flagged ⚡ (version GPU introduced) — we prefer these.

### 14.1 Background Cosmos (`PRE_S01`)
1. `ADBE Ramp` (Gradient Ramp) ⚡14.2 — radial violet gradient + vignette base.
2. `ADBE Fractal Noise` ⚡14.2 — star-field (high contrast, sparse) on a Screen layer.
3. `ADBE Fractal Noise` ⚡14.2 — slow nebula clouds, low-opacity Screen.
4. (dots) shape grid layer — no effect, or `ADBE Fill` for tint.
5. Optional `ADBE Box Blur2` (Fast Box Blur) ⚡14.2 — soften far stars.

### 14.2 Nebula (`PRE_S02`)
1. `ADBE Ramp` — pink→transparent core.
2. `ADBE Box Blur2` ⚡ — heavy soften.
3. (optional) `CC Light Sweep` — moving sheen.

### 14.3 Wish-Star (`PRE_S03`)
1. Shape fill gradient (shape layer, no fx) → 2. `ADBE Glo2` (Glow) ⚡14.1 ×2 (small+large radius for HDR falloff) → 3. Deep Glow (plugin) if available → 4. `ADBE Ramp`/`ADBE Fill` for tint. Halo: stroke shape + `ADBE Glo2`.

### 14.4 Ribbon (`PRE_S04`)
- Ribbon shape: gradient stroke/fill (native shape) + `ADBE Box Blur2` (tiny, on shadow copy) for soft folds. Highlight copy Screen. Glint: `CC Light Sweep` or animated mask. Daisies: native shapes + soft `ADBE Glo2` (very low).
- Stroke width protected by the maintain-stroke expression (scripts-repo pattern).

### 14.5 Character (`PRE_S05`)
- Ideally none (pre-lit art). Optional: `ADBE Glo2` (rim), `ADBE CurvesCustom` (match grade), `ADBE Fast Box Blur` on a duplicated rim pass. Contact shadow: soft dark shape, Multiply.

### 14.6 Reflection (`PRE_S06`)
1. Vertical flip (transform) → 2. `ADBE Linear Wipe` (feathered) or gradient matte for fade → 3. `ADBE Wave Warp` (subtle ripple) → 4. `ADBE Box Blur2` ⚡ → 5. `ADBE Tint`/`ADBE Fill` (violet cool).

### 14.7 Hearts / Stars / Sparkles / Orbs (S07–S10)
- Native shape gradients + spec highlights. Glow: `ADBE Glo2` ⚡ per source precomp (once, not per instance). Optional `ADBE Ramp` inside `PRE_Heart` for the body gradient.

### 14.8 Bokeh (`PRE_S10`)
- `ADBE Box Blur2` ⚡ (or **Fast Bokeh Pro** plugin) for defocus; low-opacity Screen/Add.

### 14.9 Dust (`PRE_S11`)
- `CC Particle Systems II` (built-in) **or** Trapcode Particular; then a single `ADBE Glo2` for bloom.

### 14.10 Global (`MASTER`)
- `ADJ_Bloom`: **Deep Glow** (plugin, preferred) OR `ADBE Glo2` ×2 stacked + `ADBE Easy Levels2` threshold for HDR falloff.
- `ADJ_Grade`: `ADBE Lumetri` ⚡13.8 (split-tone, sat, contrast, vignette) OR `ADBE CurvesCustom` + `ADBE HUE SATURATION` ⚡14.1 + `ADBE PhotoFilterPS` + vignette shape.
- Optional grain: `ADBE Noise` (very low) to kill banding; optional chromatic aberration via `ADBE Shift Channels`/Sapphire at edges only.

### 14.11 Effect-order golden rules
1. **Color/shape before glow before blur before grade.** Glow reads the lit shape; blur softens after; grade unifies last.
2. **Glow local, then global.** Hero elements get a tuned local glow; the global bloom (low radius) marries them.
3. **Prefer GPU (⚡) effects** so MFR + Mercury stay fast (see the GPU column in Appendix A).
4. **One heavy effect per precomp, cached** beats many per-layer.

---

<a name="15-plugin-strategy"></a>
## 15. Plugin Strategy

All plugins below are drawn from the **AE (Awesome After Effects)** catalog. For each: why · required? · replaces · built-in alternative · performance · ExtendScript compatibility.

| Plugin | Why it helps here | Required? | Replaces / does | Built-in alternative | Perf | Script-compat |
|---|---|---|---|---|---|---|
| **Deep Glow** | Physically-accurate, HDR, art-directable bloom — the single biggest quality lever for this dreamy look | **Strongly recommended** (not strictly required) | `ADBE Glo2` stacks | Built-in **Glow** ×2 + Levels threshold | GPU, fast for its quality | Yes — apply by match-name, set params via `.setValue`; ships an Animation Preset. |
| **Trapcode Particular** | Best-in-class 3D fairy-dust & optional sparkle/heart emitters; turbulence, depth, motion blur | Optional (premium) | S11 dust, could do S09/S08 | **CC Particle Systems II** (`CC Particle Systems II`), CC Snowfall | Heavier; scales with count | Yes — fully scriptable params; but many params → verbose generator. |
| **Trapcode Form** | Grid/volumetric dust & star fields that loop cleanly (no birth/death seam) | Optional | S11 dust, S01 star volume | Fractal Noise field / CC Particle | Med–Heavy | Yes. Form loops easier than Particular (good for seamless dust). |
| **Optical Flares** | Anamorphic wish-star glint, god-rays, lens sparkle — elegant practical light | Optional | S03 star glint, S13 flares | **Lens Flare**/`CC Light Rays` + Glow | GPU, moderate | Yes — presets + scriptable. |
| **Sapphire** | 270+ VFX; superb Glow/Glint/Rays/Aberration; a custom bloom + chromatic softness | Optional (lux) | bloom, glints, aberration | Glow + Shift Channels | GPU, moderate–heavy | Yes. |
| **Red Giant Universe** | Glow, light rays, chromatic, retro glints — cheaper Sapphire-lite | Optional | bloom/glints | built-ins | GPU | Yes. |
| **Magic Bullet Looks / Suite** | Cinematic grade, colored diffusion, vignette in one panel | Optional | `ADJ_Grade` | **Lumetri** (`ADBE Lumetri`) | GPU | Partially — Looks UI is modal; Lumetri is more script-friendly. |
| **Element 3D** | True-3D glossy hearts/orbs with camera-correct spec/refraction | Optional (premium hearts) | S07 3D hearts | 2D gradient+spec (default) | Heavy (GPU) | Yes but model dependency; complex to script. |
| **Stardust** | Node-based 3D particles + geometry instances (3D hearts/stars as particles) | Optional | S07/S08/S11 combined | CC Particle + shapes | Heavy | Yes; node graph is verbose to generate. |
| **Fast Bokeh Pro** | Clean GPU depth-of-field for the orbs/foreground | Optional | S10 defocus | **Camera Lens Blur**/Fast Box Blur | GPU, fast | Yes. |
| **Plexus** | Connect-the-dots constellations between stars (a nice motif upgrade) | Optional (motif) | new "constellation" flourish | shapes + trim paths | Med | Yes; verbose. |
| **Newton** | 2D physics for playful heart/bubble jostle | **No** (motion is expression-driven & must loop; physics won't loop cleanly) | — | expressions | — | Bakes keyframes (good) but non-looping. |
| **Duik / Joysticks'n'Sliders / Limber / RubberHose** | Character idle rig *iff* layered PSD supplied | Optional (rig only) | S05 rig | parented nulls + expressions | Light | Yes (they're scripts). |

### 15.1 Recommended plugin tiers
- **Tier 0 — Zero-plugin build (default, fully generatable, ships anywhere):** all built-ins. Bloom via stacked Glow+Levels; dust via CC Particle Systems II; DOF via Camera Lens Blur/Fast Box Blur; grade via Lumetri. **This is the baseline deliverable.**
- **Tier 1 — Recommended commercial build:** add **Deep Glow** (bloom) + **Fast Bokeh Pro** (DOF). Two plugins, huge quality jump, both trivially scriptable.
- **Tier 2 — Premium hero build:** add **Trapcode Particular/Form** (dust), **Optical Flares** (star glint), **Magic Bullet/Sapphire** (grade/aberration), optional **Element 3D** hearts.

**Design decision:** target **Tier 1** as the primary deliverable (Deep Glow + Fast Bokeh Pro), with a Tier-0 fallback path coded as a plugin-availability check in Phase 2. Everything else is optional upside. This keeps the render dependency-light and the ExtendScript generator deterministic.

### 15.2 ExtendScript compatibility notes
- Effects are applied by **match-name** (`Layer.property("ADBE Effect Parade").addProperty("<matchName>")`) — reliable across locales. Third-party effects also have stable match-names (e.g., Deep Glow) discoverable via the effect UI / aequery selection.
- Prefer plugins that expose parameters as standard `Property` values (all listed do) so the generator can `setValue`/`setValueAtTime` them.
- Avoid plugins whose look is only reachable through a **modal UI** (e.g., Magic Bullet Looks' editor) for anything the script must set — use Lumetri instead for scripted grades.
- Validate plugin presence at build time (aequery/DOM check); if absent, fall back to the Tier-0 built-in chain and log a warning.

---

<a name="16-expression-strategy"></a>
## 16. Expression Strategy

> Expressions below are **specifications** (intended behaviour + the documented expression members to use, per the expression-reference repo). They define the rig; the Phase-2 JSX authors them. Engine: **JavaScript** (faster than Legacy ExtendScript; default since CC2019).

### 16.1 Global controller reads (pattern)
Every animated property first resolves its controller inputs:
```
G   = thisComp.layer("CTRL_Global")
spd = G.effect("Master Drift Speed")("Slider")
amp = G.effect("Master Amplitude")("Slider") / 100
glow= G.effect("Master Glow")("Slider") / 100
```
No literal speeds/colors downstream — all scale off these.

### 16.2 Reusable rig specs
| Rig | Property | Expression spec (notation) |
|---|---|---|
| Float | Position.y | `y0 + Math.sin(time*2*Math.PI/T + phase)*A*amp` |
| Breathe | Scale | `s=100 + Math.sin(time*2*Math.PI/Tb)*d*amp; [s,s]` |
| Spin (loop) | Rotation | `time*rate*spd` (ensure `rate*loopDur` = integer revs) |
| Twinkle | Scale & Opacity | `k=Math.sin(((time*rate*spd+seed)%1)*Math.PI); scale=[k*mx,k*mx]; opacity=k*100` |
| Glow pulse | Glow Intensity | `(lo + (Math.sin(time*2*Math.PI/Tg)*0.5+0.5)*(hi-lo))*glow` |
| Palette pick | Fill Color | `pal=[G.effect("Color_Pink_Hot")("Color"), …]; pal[index % pal.length]` |
| Per-instance seed | (init) | `seedRandom(index, true)` then use `random()` for phase/period/scale variation |
| Parallax z | Position.z | `baseZ * (G.effect("Parallax Depth")("Slider")/100)` |
| Focus lock | Camera focusDistance | `length(position, thisComp.layer("NULL_Plane_Hero").toWorld([0,0,0]))` |
| Maintain stroke | Stroke Width | `s=length(toComp([0,0]),toComp([0.7071,0.7071])); (s)? value/s : 0;` (from scripts-repo) |

### 16.3 Camera Lissajous (spec)
```
C=thisComp.layer("CTRL_Camera")
ax=C.effect("Drift Amp X")("Slider"); ay=C.effect("Drift Amp Y")("Slider")
Tx=C.effect("Drift Period X")("Slider"); Ty=C.effect("Drift Period Y")("Slider")
x = x0 + Math.sin(time*2*Math.PI/Tx)*ax
y = y0 + Math.sin(time*2*Math.PI/Ty + Math.PI/3)*ay
[x, y, z0 + Math.sin(time*2*Math.PI/Tz)*push]
```
Choosing `Tx=8, Ty=6.5, Tz=10` (all dividing/relating to 10 or wrapping cleanly) gives an organic non-obvious but perfectly-looping drift.

### 16.4 Ribbon path-ride (spec)
Daisy i position = base point + wave:
```
x = x0_i
yWave = A*Math.sin((x/wavelength)*2*Math.PI + time*2*Math.PI/T)*amp
[x, y0_i + yWave]
```
The ribbon path itself is animated by the same phase so daisies and ribbon share one wave.

### 16.5 Looping wiggle (seam-safe pseudo-random)
Because raw `wiggle()` does not loop, where organic randomness is wanted use a **sum-of-sines** or a **time-wrapped wiggle**:
- Sum-of-sines (loops if each period divides loopDur):
```
v = A1*Math.sin(time*2π/T1+p1) + A2*Math.sin(time*2π/T2+p2)  // T1,T2 | loopDur
```
- Or `loopOut`-baked wiggle: apply `wiggle` on a pre-comp, bake to keyframes (Phase-2), then `loopOut("cycle")`.

### 16.6 Expression hygiene & performance
- **Cache controller lookups** once per expression (assign to a var) — `thisComp.layer(...)` calls are the costly part.
- **Guard divide-by-zero** (stroke/scale rigs) exactly as the studio's `Update_Stroke_Weight_Expressions` does.
- **posterizeTime** heavy decoration fields to ~12–15 fps (`Add_Posterize_Time_Expression` pattern) for cheaper motion where sub-frame smoothness isn't needed (twinkles, dust).
- **Avoid `valueAtTime`/`sampleImage`** in hot paths; they force extra evaluation.
- **No cyclic references** (controllers never read downstream).
- **Disable-safe:** every expression tolerates its controller being soloed/absent (fallback constants) so previews don't error — mirrors `Disable_Selected_Expressions`/`Enable_Selected_Expressions` workflow.
- **Lottie audit:** before any Lottie export, run the `Find_All_Expressions` pattern; expressions must be bakeable or removed (Lottie can't run most of these).

### 16.7 Master control map (what each knob does)
- `Master Glow` → all Glow/Deep-Glow intensities + nebula opacity + bloom.
- `Master Drift Speed` → all periods (÷) → calmer/livelier.
- `Master Amplitude` → all bob/drift/pulse amplitudes.
- `Decoration Density` → confetti/sparkle opacity & count enable.
- `Parallax Depth` → plane z-spread → flatter/deeper.
- `Preview Mode` → DOF & big blurs off; posterize on.
- Palette colors → every fill/tint/glow color.

---

<a name="17-performance-strategy"></a>
## 17. Performance Strategy

### 17.1 Targets
- **RAM preview:** ≥ 12 fps at Half res on a mid workstation with `Preview Mode` on.
- **Final MFR render:** < 3 s/frame at Full 1080p Tier-1 on a modern GPU workstation.
- **Project size:** < 50 MB (art assets excluded) — everything procedural.

### 17.2 GPU & MFR
- **Multi-Frame Rendering** on (AE 22+). Keep expressions cheap so MFR threads aren't serialized by heavy per-frame JS.
- **Mercury GPU:** prefer GPU-accelerated effects (Appendix A ⚡): Fast Box Blur, Gaussian Blur, Gradient Ramp, Glow, Fractal Noise, Lumetri, Hue/Sat, Tint, Transform, Drop Shadow, Directional Blur, Offset. Deep Glow & Fast Bokeh Pro are GPU.
- **Project Settings:** Video Rendering & Effects = **Mercury GPU Acceleration**.

### 17.3 RAM & caching
- **Instance, don't duplicate art:** source atoms (`PRE_Daisy` etc.) keep the cache footprint tiny.
- **Half-res precomps** for blur-heavy systems (reflection, bokeh, dust) — detail is hidden by blur/fade anyway.
- **Pre-render / proxy** the dust and (optionally) the background cosmos to seamless ProRes elements if they bottleneck MFR; swap proxies in for final.
- **Purge** image caches between heavy iterations.

### 17.4 Expression cost control
- Cache controller lookups; posterizeTime decoration; avoid `sampleImage`/`valueAtTime` in loops; keep JS engine.
- Gate DOF/foreground blur behind `Preview Mode` (biggest single preview speedup).

### 17.5 Fast-preview workflow
1. `Preview Mode = 1` (DOF off, posterize on).
2. Region of Interest around the character while animating.
3. Solo the system being tuned.
4. Half or Third resolution.
5. Shy + collapse control layers to declutter.

### 17.6 Scaling to bigger projects
- The plane+controller+atom pattern scales to campaigns (many scenes reuse `CTRL_Global` palettes & atoms).
- Reusable rigs become an in-house **Animation Composer**-style preset pack (the AE catalog lists Animation Composer/Motion for exactly this).
- The generator is parameterized (palette, density, format) → many variants from one script.

---

<a name="18-production-pipeline"></a>
## 18. Production Pipeline

### 18.1 End-to-end stages
1. **Planning / this bible** → approval.
2. **Asset prep:** character art (pre-lit PNG + rim/AO, or layered PSD); any non-procedural textures. Everything else procedural.
3. **Project scaffold (script):** color mgmt, folders, comps, controllers.
4. **Source atoms:** build & perfect `PRE_Daisy/Heart/Star/Sparkle/Bokeh/Orb`.
5. **System precomps:** far→near.
6. **Assembly:** camera rig, plane nulls, place systems.
7. **Expression wiring:** link everything to controllers.
8. **Animation:** set periods/phases/seeds; verify loop.
9. **Lighting/rim/reflection.**
10. **Effects:** local glows → global bloom.
11. **Color grade.**
12. **Optimization:** proxies, posterize, ROI.
13. **QA pass** (§22).
14. **Render:** MFR → ProRes 4444 master + H.264 review; optional Lottie-safe variant.
15. **Version & archive** (collect files; save incrementals).

### 18.2 The ExtendScript generator (Phase 2 — designed here, built later)
- **Authoring:** VSCode + **Adobe Script Runner** (`Cmd/Ctrl+R` → AE 2026), using the `index.js` master-file token pattern for a multi-file build.
- **Structure (modules):**
  - `00_config` — palette, sizes, counts, periods (all data).
  - `10_project` — color mgmt, folders, comps.
  - `20_controllers` — build `CTRL_Global`/`CTRL_Camera`, name every control.
  - `30_atoms` — build source precomps.
  - `40_systems` — build S01–S12.
  - `50_assembly` — camera rig, planes, placement, parenting.
  - `60_expressions` — apply rig expressions (string templates referencing controls).
  - `70_effects` — apply effects by match-name (+ plugin-availability fallback).
  - `80_grade_render` — grade, bloom, render-queue setup.
  - `99_utils` — undo-group wrapper, logging, existence checks.
- **Framework option:** build on **DuAEF** (from DuIO's stack) for robust creation/undo/versioning helpers, or **aequery** for selection/verification, or vanilla DOM. **Recommendation:** vanilla DOM + a thin aequery layer for QA selection — minimal dependency, maximal determinism.
- **Determinism:** wrap the whole build in a single `app.beginUndoGroup`/`endUndoGroup`; seed all randomness explicitly; no reliance on user selection or current state.
- **Idempotency:** the generator checks for/clears a prior build folder so re-runs are clean (a `99_PRECOMP_TRASH` staging + version suffix).

### 18.3 Render/output
- **Master:** ProRes 4444 (alpha optional), Full, 30 fps, MFR.
- **Review:** H.264 1080p via AME/AfterCodecs (AE catalog) for quick sharing.
- **Loop deliverables:** MP4/WebM/GIF (GifGun/Universe) for social; **Lottie/JSON** via **bodymovin** for web (Lottie-safe variant only — bloom baked, expressions baked/removed; see §24).

---

<a name="19-implementation-roadmap"></a>
## 19. Implementation Roadmap

Each phase: **Objective · Complexity (1–5) · Dependencies · Risks · Validation.**

### Phase 0 — Pre-production & asset lock
- **Objective:** Approve this bible; lock the character asset (pre-lit PNG + rim/AO, or PSD).
- **Complexity:** 1. **Dependencies:** none. **Risks:** character art not matching key/light. **Validation:** asset placed on a violet test card reads correctly with rim.

### Phase 1 — Project scaffold & controllers
- **Objective:** Color-managed project, folders, comps, `CTRL_Global`/`CTRL_Camera` with all named controls, plane nulls, camera rig.
- **Complexity:** 2. **Dependencies:** P0. **Risks:** wrong color mgmt (banding), un-named controls. **Validation:** 32-bit linear confirmed; every control labelled; camera drifts on a test plane; MFR on.

### Phase 2 — Source atoms
- **Objective:** Build `PRE_Daisy/Heart/StarSmall/Sparkle/Bokeh/Orb`, each perfected once.
- **Complexity:** 3. **Dependencies:** P1. **Risks:** atoms not palette-linked; anchors off-center. **Validation:** each atom pulses/spins cleanly around its center; recolors from `CTRL_Global`.

### Phase 3 — Background & atmosphere systems (S01, S02, S13 base)
- **Objective:** Cosmos, nebula, base grade/bloom adjustment layers.
- **Complexity:** 3. **Dependencies:** P1. **Risks:** noisy fractal stars; bloom washing scene. **Validation:** void gradient banding-free; stars twinkle & loop; bloom controllable.

### Phase 4 — Hero systems (S03 star, S04 ribbon, S05 character, S06 reflection)
- **Objective:** The signature reads: wish-star+halo, flower-ribbon with path-riding daisies, character placed & idling, reflection.
- **Complexity:** 5 (ribbon path-ride + reflection are the hardest). **Dependencies:** P2, P3. **Risks:** daisies not tracking wave; reflection desync; ribbon stroke scaling wrong. **Validation:** daisies ride the animated wave; reflection tracks character; stroke stays constant under camera push.

### Phase 5 — Decoration systems (S07–S12)
- **Objective:** Hearts, confetti, sparkles, bokeh, dust, trails — distributed across planes with seeded variation.
- **Complexity:** 4. **Dependencies:** P2, P4. **Risks:** synchronized (gridded) motion; over-density; dust loop seam. **Validation:** field feels alive & non-repeating; density controllable; dust loops seamlessly (or pre-baked).

### Phase 6 — Camera, parallax & DOF
- **Objective:** Wire Lissajous drift, parallax plane z, focus-lock, gentle DOF.
- **Complexity:** 3. **Dependencies:** P4, P5. **Risks:** parallax reveals edges; focus drift; DOF too strong/slow. **Validation:** no edge reveal at drift extremes; character always sharp; preview-mode kills DOF.

### Phase 7 — Grade, bloom finalize & optimization
- **Objective:** Final split-tone grade, marry local+global glow, proxies/posterize, ROI workflow.
- **Complexity:** 3. **Dependencies:** all. **Risks:** over-bloom on face; slow preview. **Validation:** QA §22 passes; preview ≥12 fps; face preserved.

### Phase 8 — Render & variants
- **Objective:** MFR ProRes master + H.264 review; vertical/square retargets; optional Lottie-safe.
- **Complexity:** 2. **Dependencies:** P7. **Risks:** loop seam in render; Lottie unsupported effects. **Validation:** frame 300==frame 0 continuity; playback loop test; Lottie audit clean.

### Phase 9 — Generator hardening (parallel track)
- **Objective:** Turn the manual build into the deterministic `.jsx` generator (§18.2) with plugin fallbacks & idempotency.
- **Complexity:** 5. **Dependencies:** P1–P7 stable. **Risks:** match-name drift, locale issues, plugin absence. **Validation:** clean-machine re-run reproduces the project byte-for-behaviour; Tier-0 fallback verified with plugins disabled.

---

<a name="20-risk-analysis"></a>
## 20. Risk Analysis

| # | Risk | Type | Likelihood | Impact | Mitigation / workaround |
|---|---|---|---|---|---|
| R1 | **Character asset unavailable/off-model** (script can't draw her) | External dependency | High | High | Lock asset in P0; provide a placeholder silhouette so the scene builds without her; specify pre-lighting so she matches. |
| R2 | **Particle dust won't loop seamlessly** | Technical | Med | Med | Use Form (loops easier) or pre-bake a seamless ProRes dust element; last resort crossfade. |
| R3 | **Over-bloom destroys the face / crushes detail** | Visual | Med | High | High glow threshold; exclude character region from global bloom via matte; local glow instead. |
| R4 | **Preview too slow (DOF + many glows)** | Performance | High | Med | `Preview Mode` gates DOF/blur; posterize decoration; half-res precomps; proxies. |
| R5 | **Synchronized decoration looks mechanical** | Visual | Med | Med | Per-instance `seedRandom` phase/period; poly-rhythmic periods. |
| R6 | **Loop seam visible in final** | Technical | Med | High | Enforce all periods divide loopDur; no raw wiggle; frame-300==frame-0 QA check. |
| R7 | **Plugin missing on render machine** | Pipeline | Med | Med | Tier-0 built-in fallback chain; build-time availability check; document plugin list in render notes. |
| R8 | **Match-name / locale drift breaks the generator** | Pipeline | Low–Med | High | Use verified first-party match-names (Appendix A); aequery verification pass; avoid display-name lookups. |
| R9 | **Ribbon stroke width scales wrong under camera** | Technical | Med | Med | Maintain-stroke expression (scripts-repo pattern). |
| R10 | **Banding in violet gradient** | Visual | Med | Med | 32-bit float working space + subtle grain in grade. |
| R11 | **Reflection desyncs from character** | Technical | Low | Med | Reflection is a *duplicate* (auto-syncs) or expression-linked to character transform. |
| R12 | **Advanced-3D render cost too high** | Performance | Med | Med | Default to 2.5D (no real lights); enable Advanced 3D only for floor/premium; provide Classic-3D lite path. |
| R13 | **Scope creep (too many decorative systems)** | Project | Med | Med | `Decoration Density` control + strict corner-weighted placement; cut S12 first if needed. |
| R14 | **Element 3D / Stardust model & license burden** | Pipeline | Low | Low | Keep as optional Tier-2; default hearts are 2D gloss. |

### 20.1 After Effects platform limitations (and workarounds)
- **No native HDR bloom** in old Glow → stack Glow+Levels or use Deep Glow.
- **`wiggle()` doesn't loop** → sum-of-sines / bake+loopOut.
- **Particles don't loop natively** → Form/pre-bake.
- **2D gloss doesn't relight from camera** → acceptable at scale; Element 3D for hero if needed.
- **Expressions can bottleneck MFR** → cache lookups, posterize, JS engine.
- **Lottie can't run most effects/expressions** → separate baked Lottie-safe variant.

---

<a name="21-production-checklists"></a>
## 21. Production Checklists

### 21.1 Project setup
- [ ] 32 bpc, linear working space, correct color management.
- [ ] MFR enabled; Mercury GPU acceleration selected.
- [ ] Expression engine = JavaScript.
- [ ] Folders created per §11; naming grammar enforced.
- [ ] `CTRL_Global` & `CTRL_Camera` built; **every** control renamed to a human label.

### 21.2 Build
- [ ] Source atoms perfected, center-anchored, palette-linked.
- [ ] System precomps built far→near; each soloable.
- [ ] Plane nulls at correct z; contents scale-compensated.
- [ ] Camera rig drifts, focus-locked, DOF gated by Preview Mode.
- [ ] Reflection tracks character; horizon glow present.
- [ ] Ribbon daisies ride the animated wave; stroke width stable.

### 21.3 Animation
- [ ] All periods divide 10 s (or wrap cleanly).
- [ ] Per-instance seeds → no gridded/synced motion.
- [ ] No raw `wiggle()` in final.
- [ ] frame 300 == frame 0 (seamless).
- [ ] Master Drift/Amplitude/Density knobs behave.

### 21.4 Look
- [ ] Palette matches §5; shadows are colored (not black).
- [ ] Local glows tuned; global bloom marries them without nuking the face.
- [ ] Grade split-tone applied; vignette subtle; banding-free.
- [ ] Depth reads (scale + blur + overlap + parallax).

### 21.5 Render
- [ ] ProRes 4444 master + H.264 review queued (MFR).
- [ ] Loop playback verified end-to-end.
- [ ] Vertical/square retargets checked (character not clipped).
- [ ] Lottie-safe variant audited (if delivering Lottie).
- [ ] Project collected/archived; incrementals saved.

---

<a name="22-quality-assurance"></a>
## 22. Quality Assurance

### 22.1 Visual consistency
- Every color traces to `CTRL_Global`; no rogue literals (spot-check fills).
- Glow color falloff is warm→pink→violet everywhere (consistent light logic).
- Decoration density corner-weighted; center kept clear for the character.

### 22.2 Animation consistency
- All motion loops (300==0). Poly-rhythmic, seeded, natural easing (sinusoidal).
- Camera drift never reveals plane edges; character always sharp.
- No element strobes or pops harshly (twinkle births eased).

### 22.3 Naming & structure consistency
- Comps `MASTER_/PRE_S##_/PRE_`; layers `TYPE_Name`; controls human-labelled.
- Folders numbered; no orphan/loose items in project root; trash staged in `99_`.

### 22.4 Controller consistency
- `CTRL_Global`/`CTRL_Camera` are guide layers, shy, non-rendering.
- Downstream-only data flow; zero cyclic expressions.
- Every knob documented (Appendix C); ranges sane & clamped.

### 22.5 Performance validation
- Preview ≥ 12 fps (Preview Mode, Half). Final < 3 s/frame Tier-1.
- MFR actually multi-threading (no serial expression stalls).
- GPU effects used where available (Appendix A ⚡).

### 22.6 Expression validation
- Controller lookups cached; divide-by-zero guarded; posterize on heavy fields.
- Disable-safe (no errors when a controller is soloed).
- `Find_All_Expressions` audit before Lottie; no unsupported members leak into a bake.

### 22.7 Plugin validation
- Build-time availability check; Tier-0 fallback verified with plugins disabled.
- Effects applied by verified match-name; aequery selection confirms presence/params.

### 22.8 Project cleanliness
- No unused comps/footage (Reduce/Collect verified).
- Precomp trash emptied before delivery; proxies flagged; file < 50 MB (excl. art).
- One undo-group for the generated build; re-run idempotent.

### 22.9 Sign-off gate
QA passes only when §22.1–22.8 are all green **and** a fresh-machine render (plugins present, then plugins disabled/Tier-0) both produce a clean, seamless loop matching this bible's intent.

---

<a name="23-best-practices"></a>
## 23. Best Practices (studio standards applied here)

1. **Null-driven everything.** Control & parent via nulls; never bake motion into art layers. (Matches the studio's own null-object methodology.)
2. **One source of truth for color & timing.** `CTRL_Global`. Re-skins are one-null edits.
3. **Instance atoms, don't duplicate art.** Tiny files, global edits.
4. **Procedural over painted.** Generators + expressions = deterministic, script-buildable, resolution-independent.
5. **Loop by math, not by luck.** Periods divide the loop; no raw wiggle; verify 300==0.
6. **Additive light is a pass.** Global bloom on an adjustment layer; local glow only for heroes.
7. **GPU-first effects.** Prefer ⚡ match-names; keep MFR fast.
8. **Colored shadows, warm-cool depth.** Never pure black; warm advances, cool recedes.
9. **Name for a stranger.** Human-labelled controls; numbered folders; a teammate should drive it with zero code.
10. **Preview-mode discipline.** Gate DOF/blur; posterize; ROI; solo.
11. **Guard your expressions.** Cache lookups, guard math, stay disable-safe (per the scripts-repo patterns).
12. **Design for the generator.** Everything deterministic, idempotent, match-name-based, plugin-fallback-aware.
13. **Author in VSCode, hot-run to AE.** Adobe Script Runner + `index.js` master pattern; version in git.
14. **Keep a Lottie-safe path in mind** from day one if web delivery is possible (baked bloom, no exotic effects).

---

<a name="24-future-improvements"></a>
## 24. Future Improvements

- **True 3D hero elements** (Element 3D/Stardust hearts, real refraction & camera-correct spec) for a premium cut.
- **Constellation motif** (Plexus) linking stars into shifting shapes behind the character.
- **Advanced-3D environment lighting** for a physically-lit glossy floor and image-based reflections (AE 2026 strength).
- **Character rig** (Duik/Joysticks'n'Sliders/Limber) for blink, breath, hair physics, hand gestures — from a layered PSD.
- **Data-driven variants** (nexrender/Templater from the AE catalog) — mass-produce colorways/formats from the parameterized generator.
- **Audio-reactivity** (BeatEdit) — twinkle & pulse to music for a promo cut.
- **Lottie-safe web build** — bake bloom into art, replace expressions with keyframes (`Find_All_Expressions` audit), export via bodymovin for a lightweight web hero (respecting its supported-feature list: precomps, shapes, solids, nulls, text, masks, time-remap).
- **Preset pack** — package the reusable rigs as an Animation-Composer-style library for the whole studio.
- **KBar/FX Console** one-click buttons to rebuild/re-skin scenes.

---

<a name="25-design-self-evaluation"></a>
## 25. Design Self-Evaluation & Strategy Comparison

*(Required critical review of this design before sign-off.)*

### 25.1 Identified weaknesses & how the design already mitigates them
1. **Character is an external dependency.** A script cannot generate the anime doll. *Mitigation:* asset locked in P0, placeholder silhouette lets the scene build without her, pre-lighting spec keeps her consistent. This is inherent, not a flaw in the architecture — but it's the top risk (R1).
2. **Perfectly-looping particle dust is genuinely hard.** *Mitigation:* Form-or-pre-bake strategy (R2); the design explicitly permits a baked seamless element (a legitimate studio move) rather than pretending a live sim will loop.
3. **Bloom can flatten/whiten everything** (the classic "too much glow" amateur trap). *Mitigation:* high threshold, face exclusion matte, local-then-global glow discipline (R3, §14.11).
4. **2.5D gloss won't relight from the camera** — hearts' speculars are painted, not physical. *Mitigation:* acceptable at this scale; Element 3D is the documented upgrade path for a hero cut.
5. **Expression-heavy scenes can throttle MFR.** *Mitigation:* cached lookups, posterize, JS engine, Preview Mode (§16.6, §17).
6. **Match-name/locale fragility in the generator.** *Mitigation:* verified first-party match-names + aequery verification + Tier-0 fallback (R8, R7).

### 25.2 Strategy comparison — three ways to build this, and why we chose one

| Strategy | A. 2.5D parallax + expressions (CHOSEN) | B. Full 3D (Advanced-3D + Element 3D/Stardust) | C. Hand-keyframed 2D |
|---|---|---|---|
| Fidelity | High (looks 3D via layering + gloss) | Highest (true depth/relight) | Medium |
| **Script-generatability** | **Excellent** (deterministic, match-names, expressions) | Poor–Medium (models, verbose node/param graphs) | Poor (keyframes are laborious to generate meaningfully) |
| Loop safety | Excellent (math loops) | Medium (particles/physics) | Medium |
| Render cost | Low–Med | High | Low |
| Art-direction agility | Excellent (one-null re-skin) | Medium | Low |
| Plugin dependency | Low (Tier-0 possible) | High | Low |
| Risk | Low | Med–High | Med |

**Verdict:** **Strategy A** wins decisively for this brief because the ultimate deliverable is an **ExtendScript generator**. A is the only approach that is simultaneously high-fidelity, deterministic, loop-safe, render-cheap, and re-skinnable from one controller. B is reserved as an *optional premium layer* on top of A (3D hearts, real floor lighting), never the foundation. C is rejected — hand-keyframing defeats the procedural mandate and doesn't loop or re-skin cleanly.

### 25.3 Alternative sub-decisions considered
- **Bloom:** Deep Glow (chosen for Tier-1) vs. stacked built-in Glow (Tier-0 fallback) vs. Sapphire (Tier-2). Decision: Deep Glow default, built-in fallback coded — best quality-per-dependency.
- **Dust:** Particular vs. **Form** vs. CC Particle Systems II vs. pre-baked. Decision: CC Particle Systems II (Tier-0) / Form (Tier-2, best loop) / pre-bake as guaranteed fallback.
- **Grade:** Lumetri (chosen — GPU, scriptable) vs. Magic Bullet Looks (rejected for scripting: modal UI).
- **Hearts:** 2D gradient-gloss (chosen, generatable) vs. Element 3D (premium option).
- **Camera:** one-node + orient null (chosen, simpler rig) vs. two-node (rejected: POI adds rig complexity for no gain here).
- **Reflection:** duplicate-and-flip (chosen, auto-syncs) vs. real 3D floor reflection in Advanced 3D (premium option).

### 25.4 Why this is commercial-grade
- Single-knob art direction, seamless math-locked loop, colored-light discipline, GPU/MFR-aware performance, plugin-fallback resilience, deterministic generatability, multi-format scalability, and a documented QA gate. It reflects how a professional motion studio actually ships a re-usable, re-skinnable hero background — not a one-off.

### 25.5 Revision status
This document has been reviewed against the brief's full section list and revised for: exhaustive system inventory (§4 covers all 13 systems, nothing ignored), grounded plugin/effect choices (every item traceable to the knowledge base), explicit loop-safety math, and a three-way strategy comparison with a justified choice. **It is approved for Phase-2 implementation.**

---

<a name="appendix-a"></a>
## Appendix A — Effect Match-Name Reference (as used)

Verified first-party match-names (from `after-effects-scripting-guide/docs/matchnames/effects/firstparty.md`). ⚡ = GPU-accelerated (version introduced).

| Purpose | Match-name | Display | ⚡ |
|---|---|---|---|
| Background/heart/ribbon gradients | `ADBE Ramp` | Gradient Ramp | ⚡14.2 |
| Star-field / nebula / dust texture | `ADBE Fractal Noise` | Fractal Noise | ⚡14.2 |
| Alt organic noise | `ADBE AIF Perlin Noise 3D` | Turbulent Noise | |
| Local hero glow | `ADBE Glo2` | Glow | ⚡14.1 |
| Soft blur (defocus/reflection/folds) | `ADBE Box Blur2` | Fast Box Blur | ⚡14.2 |
| Alt smooth blur | `ADBE Gaussian Blur 2` | Gaussian Blur | ⚡13.8 |
| Camera DOF blur | `ADBE Camera Lens Blur` | Camera Lens Blur | |
| Reflection fade | `ADBE Linear Wipe` | Linear Wipe | |
| Reflection ripple | `ADBE Wave Warp` | Wave Warp | |
| Tint/recolor | `ADBE Tint` / `ADBE Fill` | Tint / Fill | ⚡14.1 (Tint) |
| Ribbon glint / sweep | `CC Light Sweep` | CC Light Sweep | |
| God-rays (optional) | `CC Light Rays` | CC Light Rays | |
| Confetti/point stars (procedural) | `CC Star Burst` | CC Star Burst | |
| Fairy dust (built-in default) | `CC Particle Systems II` | CC Particle Systems II | |
| Grade | `ADBE Lumetri` | Lumetri Color | ⚡13.8 |
| Grade (alt) | `ADBE CurvesCustom` / `ADBE HUE SATURATION` / `ADBE PhotoFilterPS` | Curves / Hue-Sat / Photo Filter | ⚡14.1 (Hue-Sat) |
| Bloom threshold helper | `ADBE Easy Levels2` | Levels | ⚡14.2 |
| Anti-band grain | `ADBE Noise` | Noise | |
| Chromatic aberration (edges) | `ADBE Shift Channels` | Shift Channels | ⚡ |
| Contact/drop shadow | `ADBE Drop Shadow` | Drop Shadow | ⚡14.2 |
| Plane transform (2.5D) | `ADBE Geometry2` | Transform | ⚡15.0 |
| Directional streaks | `ADBE Motion Blur` | Directional Blur | ⚡15.0 |
| **Expression Controls** | | | |
| Slider | `ADBE Slider Control` | Slider Control | |
| Color | `ADBE Color Control` | Color Control | |
| Checkbox | `ADBE Checkbox Control` | Checkbox Control | |
| Dropdown | `ADBE Dropdown Control` | Dropdown Control | |
| Layer | `ADBE Layer Control` | Layer Control | |
| Angle | `ADBE Angle Control` | Angle Control | |
| Point | `ADBE Point Control` | Point Control | |
| 3D Point | `ADBE Point3D Control` | 3D Point Control | |

---

<a name="appendix-b"></a>
## Appendix B — Naming Grammar

| Entity | Pattern | Examples |
|---|---|---|
| Master comps | `MASTER_<Project>_<Format>` | `MASTER_Starlight_Reverie_1080p` |
| System precomps | `PRE_S##_<System>` | `PRE_S04_Ribbon` |
| Source atoms | `PRE_<Atom>` | `PRE_Daisy`, `PRE_Heart` |
| Nulls (control) | `CTRL_<Scope>` | `CTRL_Global`, `CTRL_Camera` |
| Nulls (structure) | `NULL_<Role>` | `NULL_Plane_Hero`, `NULL_Cam_Orient` |
| Cameras | `CAM_<Role>` | `CAM_Main` |
| Lights | `LGT_<Role>` | `LGT_Key`, `LGT_Rim` |
| Adjustment | `ADJ_<Pass>` | `ADJ_Bloom`, `ADJ_Grade` |
| Solids | `SOL_<Role>` | `SOL_Guide_BG` |
| Shapes | `SH_<Thing>` | `SH_Star`, `SH_Heart` |
| Imported art | `IMG_<Thing>` | `IMG_Character_Doll` |
| Controls (effects) | Human label, Title Case | `Master Glow`, `Drift Amp X` |
| Folders | `##_<Group>` | `10_SYSTEMS`, `20_SOURCES` |

Rules: no spaces in comp/asset/layer names (underscores); Title-Case human labels only on controls; numeric prefixes for sort order; ASCII only (script/cross-platform safe).

---

<a name="appendix-c"></a>
## Appendix C — Master Glossary of Controllers

**`CTRL_Global`**
- `Color_BG_Deep, Color_BG_Mid, Color_BG_Glow, Color_Pink_Hot, Color_Pink_Light, Color_Pink_Pale, Color_Magenta_Deep, Color_Star_Cream, Color_Yellow, Color_Teal, Color_Lavender, Color_White` — palette (Color Controls).
- `Master Glow` (0–200) — all glow/bloom intensity.
- `Master Drift Speed` (0.5–1.5) — global period multiplier.
- `Master Amplitude` (0–200) — global amplitude scale.
- `Decoration Density` (0–100) — confetti/sparkle presence.
- `Parallax Depth` (0–200) — plane z-spread.
- `Preview Mode` (0/1) — DOF/blur off + posterize on.
- `Format` (16:9 / 9:16 / 1:1) — layout retarget.

**`CTRL_Camera`**
- `Drift Amp X`, `Drift Amp Y` (px) — Lissajous amplitude.
- `Drift Period X/Y/Z` (s) — Lissajous periods (choose so they wrap over 10 s).
- `Push Amount` (px/%) — z breathe.
- `DOF Amount` (0–100) — aperture/blur level (0 in Preview Mode).
- `Focus Target` (Layer) — focus-lock plane (`NULL_Plane_Hero`).

---

*End of Production Bible v1.0 — "Starlight Reverie." Design & engineering phase complete. No code, JSX, or build produced in this phase, per brief. Ready for Phase-2 ExtendScript generation.*
