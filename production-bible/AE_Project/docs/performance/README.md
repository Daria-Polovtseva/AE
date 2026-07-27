# Performance

Implements Production Bible §17.

## Targets
- RAM preview ≥ 12 fps at Half res with `Preview Mode` on.
- Final MFR render < 3 s/frame at Full 1080p (Tier-1 plugins) on a modern GPU workstation.
- Project file < 50 MB excluding imported art.

## Levers built into the generator
- **GPU-first effects** — Gradient Ramp, Fractal Noise, Fast Box Blur, Glow, Lumetri, Tint, Transform
  (all Mercury-accelerated; see Bible Appendix A). Set *Project ▸ Mercury GPU Acceleration*.
- **Multi-Frame Rendering** — expressions cache controller lookups; no `sampleImage` / `valueAtTime`
  in hot paths, so MFR threads are not serialized.
- **Instancing over duplication** — six reusable source atoms feed all decoration; tiny cache/file.
- **Preview gating** — `Preview Mode = 1` forces camera Blur Level to 0 (kills the biggest preview cost).
- **Baked variation** — instance phases/periods are literals (deterministic + cheap), not per-frame RNG.
- **Blur locality** — defocus lives inside bokeh/reflection atoms (one blur each), not per instance.

## Manual (non-scriptable) steps the build logs
Enabling MFR globally and switching to the Advanced-3D renderer are project/preference actions the DOM
cannot fully set headlessly; the generator logs a reminder.
