# Plugins

Implements Production Bible §15. Every plugin is drawn from the connected Awesome-AE catalog. The
generator **detects** each recommended plugin at build time (multi-candidate match-name probe in a
disposable comp) and **substitutes the closest built-in** when absent. It never fails on a missing plugin.

## Fallback matrix
| System | Preferred plugin | Built-in fallback |
|---|---|---|
| Global + hero bloom | Deep Glow | `ADBE Glo2` ×2 (small+large radius) + Levels threshold |
| Fairy dust (S11) | Trapcode Particular → Trapcode Form | `CC Particle Systems II` → instanced shape dust |
| Wish-star glint | Optical Flares | built-in Glow / `CC Light Rays` |
| Bokeh DOF | Fast Bokeh Pro | `ADBE Box Blur2` / Camera Lens Blur |
| Grade | (native) | `ADBE Lumetri` → Curves + Hue/Sat + Photo Filter |
| 3D hearts (optional) | Element 3D / Stardust | 2D gradient-gloss hearts (default) |
| Additional glow options | Sapphire Glow, Universe Glow | built-in Glow |

## Tiers
- **Tier 0** — all built-in; the guaranteed baseline, fully deterministic.
- **Tier 1** — + Deep Glow + Fast Bokeh Pro (recommended commercial build).
- **Tier 2** — + Particular/Form, Optical Flares, Magic Bullet/Sapphire, optional Element 3D.

The plugin layer (`src/plugins/*`) exposes a capability object the effect/particle builders query, so
each builder chooses preferred-vs-fallback at construction time and records the choice to the log.
