# Scene Design

Implements Production Bible §3 (Reference Analysis), §4 (Visual Breakdown), §5 (Color), §6 (Lighting),
§7 (Camera), §8 (Animation). This is the reverse-engineering of the supplied reference image.

## The 13 visual systems (nothing ignored)
| ID | System | Depth plane | Module (target) |
|---|---|---|---|
| S01 | Background Cosmos (violet ramp, star-field, nebula clouds, dot texture) | Far | `scene/s01_background` |
| S02 | Nebula Light Streak | Far | `scene/s02_nebula` |
| S03 | Wish-Star + Halo | Mid-far | `scene/s03_wishstar` |
| S04 | Flower-Ribbon Banner + wave-riding daisies | Mid | `scene/s04_ribbon` |
| S05 | Character ("The Doll") | Hero | `scene/s05_character` |
| S06 | Reflection Floor | Hero | `scene/s06_reflection` |
| S07 | Hero Hearts (gloss) | Near+Mid | `scene/s07_hearts` |
| S08 | Star Confetti | Near+Mid | `scene/s08_stars` |
| S09 | Plus-Sparkles | Near | `scene/s09_sparkles` |
| S10 | Bokeh & Orbs | Near+Far | `scene/s10_bokeh` |
| S11 | Fairy-Dust Particles | Volumetric | `scene/s11_dust` |
| S12 | Light Trails / Swooshes | Mid/Near | `scene/s12_trails` |
| S13 | Global Atmosphere (bloom + grade + vignette) | Post | `effects/grade`, `effects/bloom` |

## Palette, lighting, camera, animation
All numeric values live in `src/core/10_config` and are mirrored to the `CTRL_Global` / `CTRL_Camera`
controllers so the whole scene re-skins/retimes from one place. See Bible §5.1 (palette), §6 (light
hierarchy: ambient fill + warm key upper-left + cool rim + wish-star practical + floor bounce), §7
(≈40 mm one-node camera, Lissajous micro-drift, hero-locked focus, preview-gated DOF), §8 (float /
breathe / drift / spin / twinkle / undulate / glow-pulse vocabulary, all looping over 300 frames).
