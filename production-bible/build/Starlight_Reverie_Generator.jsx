// =====================================================================================
//  STARLIGHT REVERIE — After Effects 2026 Project Generator  (Phase 2)
//  Implements the approved Production Bible v1.0 (see production-bible/PRODUCTION-BIBLE.md)
//
//  A single, self-contained, restart-safe ExtendScript that procedurally builds the
//  entire "Starlight Reverie" kawaii / magical-girl looping hero scene:
//  color-managed project, folder tree, master controllers, reusable source atoms,
//  visual systems S01..S12, 7-plane parallax stack, camera rig, lighting, global
//  bloom + grade, reusable looping expression rigs, plugin detection with built-in
//  fallbacks, render-queue setup, and a full internal validation pass.
//
//  DESIGN CONTRACT: this file implements the Bible; it does not redesign it.
//  Every builder maps to a Bible section (referenced in comments as [Bible §N]).
//
//  Authoring/run: open in VS Code and run into AE 2026 via Adobe Script Runner
//  (Cmd/Ctrl+R -> adobeScriptRunner.ae), or File > Scripts > Run Script File...
//
//  ExtendScript dialect: ES3-safe (var, function declarations, for-loops only).
//  Expression strings target the AE JavaScript expression engine (javascript-1.0).
// =====================================================================================

#target aftereffects

(function StarlightReverie() {
    "use strict";

    // =================================================================================
    //  0. CONFIG  — single source of truth for data (no magic numbers downstream) [Bible §1.2, §5, §8, §10]
    // =================================================================================
    var CFG = {
        project: {
            name: "Starlight_Reverie",
            prefix: "SR",                 // namespace tag for restart-safety
            rebuildClean: true,           // remove a prior build of this project before rebuilding
            bitsPerChannel: 32,           // 32-bit float linear working space  [Bible §1.2]
            linearize: true,
            expressionEngine: "javascript-1.0"
        },
        comp: {
            width: 1920, height: 1080, pixelAspect: 1.0,
            fps: 30, durationSec: 10,     // 300-frame seamless loop  [Bible §1.2, §8.4]
            bgOversizePct: 120,           // background oversized so camera push never reveals edges
            motionBlur: true, shutterAngle: 180, shutterPhase: -90,
            mbSamples: 16, mbAdaptiveLimit: 32
        },
        // ---- Palette (sRGB hex reference; project works in 32-bit linear)  [Bible §5.1] ----
        palette: {
            BG_Deep:       "#160726",
            BG_Mid:        "#3A1B63",
            BG_Glow:       "#5B2E8C",
            Pink_Hot:      "#FF4DA6",
            Pink_Light:    "#FF9AD1",
            Pink_Pale:     "#FFD6EC",
            Magenta_Deep:  "#C21E7A",
            Star_Cream:    "#FFF3C4",
            Yellow:        "#FFD24A",
            Teal:          "#4FE6C4",
            Lavender:      "#C9B3FF",
            White:         "#FFFFFF"
        },
        // ---- The 7-plane parallax depth stack  [Bible §9.2] ----
        //  z is kept in front of the camera (cameraZ = -zoomPx); `factor` drives the
        //  expression-based 2.5D parallax offset that preserves full-frame coverage.
        planes: [
            { name: "NULL_Plane_Far",        z: 2400,  factor: 0.25 },
            { name: "NULL_Plane_MidFar",     z: 1400,  factor: 0.45 },
            { name: "NULL_Plane_Mid",        z: 700,   factor: 0.70 },
            { name: "NULL_Plane_Hero",       z: 0,     factor: 1.00 },
            { name: "NULL_Plane_NearMid",    z: -400,  factor: 1.30 },
            { name: "NULL_Plane_Near",       z: -900,  factor: 1.70 },
            { name: "NULL_Plane_Foreground", z: -1400, factor: 2.20 }
        ],
        // ---- Decoration counts  [Bible §4 S07..S12] ----
        counts: {
            daisies: 9,
            heartsNear: 3, heartsMid: 4, heartsSmall: 5,
            stars: 15,
            sparkles: 24,
            bokehNear: 6, bokehFar: 8,
            orbs: 3
        },
        camera: {
            zoomPx: 1900,                 // ~ 40mm-equivalent; also camera pull-back so all planes stay in front  [Bible §7.2]
            driftAmpX: 6, driftAmpY: 4, pushZ: 26,
            // loop-safe: X=5s(2 cycles), Y=10/3s(3 cycles), Z=10s(1 cycle) -> organic yet seamless
            driftPeriodX: 5, driftPeriodY: (10 / 3), driftPeriodZ: 10,
            dofAmount: 30
        },
        seed: 20260723                    // deterministic build seed (today's date)  [Bible §16.2]
    };

    // =================================================================================
    //  1. LOG + small deterministic PRNG  [Bible §18.2 determinism]
    // =================================================================================
    var LOG = { lines: [], warns: 0, errors: 0 };
    function log(msg)  { LOG.lines.push("  " + msg); try { $.writeln("[SR] " + msg); } catch (e) {} }
    function warn(msg) { LOG.warns++; LOG.lines.push("  ! WARN: " + msg); try { $.writeln("[SR][WARN] " + msg); } catch (e) {} }
    function err(msg)  { LOG.errors++; LOG.lines.push("  X ERROR: " + msg); try { $.writeln("[SR][ERROR] " + msg); } catch (e) {} }

    // Mulberry32-style deterministic PRNG so instance variation is reproducible across runs.
    var _rngState = CFG.seed >>> 0;
    function rnd() {
        _rngState = (_rngState + 0x6D2B79F5) >>> 0;
        var t = _rngState;
        t = Math.imul ? Math.imul(t ^ (t >>> 15), t | 1) : ((t ^ (t >>> 15)) * (t | 1)) >>> 0;
        t = (t + (((t ^ (t >>> 7)) >>> 0) * (t | 61) >>> 0)) >>> 0;
        var r = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        return r;
    }
    function rndRange(a, b) { return a + (b - a) * rnd(); }
    function rndInt(a, b)   { return Math.floor(rndRange(a, b + 1)); }
    // Loop-safe period: returns durationSec/n (an exact divisor of the loop) nearest a target
    // range, so sin(time*2*PI/period) closes perfectly at frame 300. [Bible §8.4, §22.2]
    function loopPeriod(minSec, maxSec) {
        var target = rndRange(minSec, maxSec);
        var n = Math.max(1, Math.round(CFG.comp.durationSec / target));
        return CFG.comp.durationSec / n;
    }
    // Loop-safe twinkle rate: integer cycles over the loop -> rate*durationSec is an integer.
    function loopRate(minCycles, maxCycles) { return rndInt(minCycles, maxCycles) / CFG.comp.durationSec; }

    // =================================================================================
    //  2. COLOR + PROPERTY UTILITIES
    // =================================================================================
    function hexToRGB(hex) {
        hex = ("" + hex).replace("#", "");
        var r = parseInt(hex.substr(0, 2), 16) / 255;
        var g = parseInt(hex.substr(2, 2), 16) / 255;
        var b = parseInt(hex.substr(4, 2), 16) / 255;
        return [r, g, b];
    }

    // Safe wrappers — a generator must never hard-fail on one fragile DOM call. [Bible §20 R8]
    function trySet(prop, value) {
        try { if (prop && prop.setValue) { prop.setValue(value); return true; } } catch (e) { warn("setValue failed: " + e.toString()); }
        return false;
    }
    function tryExpr(prop, expr) {
        try { if (prop) { prop.expression = expr; return true; } } catch (e) { warn("expression failed: " + e.toString()); }
        return false;
    }
    // set an effect parameter by property name, falling back to index; tolerant of locale drift.
    function setParam(effect, nameOrIndex, value) {
        if (!effect) { return false; }
        var p = null;
        try { p = (typeof nameOrIndex === "number") ? effect.property(nameOrIndex) : effect.property(nameOrIndex); } catch (e) { p = null; }
        return trySet(p, value);
    }
    function exprParam(effect, nameOrIndex, expr) {
        if (!effect) { return false; }
        var p = null;
        try { p = effect.property(nameOrIndex); } catch (e) { p = null; }
        return tryExpr(p, expr);
    }

    // =================================================================================
    //  3. PROJECT / FOLDER / COMP / LAYER HELPERS  (idempotent, restart-safe) [Bible §11, §18.2]
    // =================================================================================
    function findItemByName(name, kindCtor) {
        var items = app.project.items;
        for (var i = 1; i <= items.length; i++) {
            var it = items[i];
            if (it.name === name && (!kindCtor || it instanceof kindCtor)) { return it; }
        }
        return null;
    }
    function getOrCreateFolder(name, parent) {
        var f = findItemByName(name, FolderItem);
        if (!f) { f = app.project.items.addFolder(name); }
        if (parent) { try { f.parentFolder = parent; } catch (e) {} }
        return f;
    }
    function getOrCreateComp(name, w, h, dur, fps, parentFolder) {
        var c = findItemByName(name, CompItem);
        if (c) { return c; } // already built this run (idempotent)
        c = app.project.items.addComp(name, Math.round(w), Math.round(h), CFG.comp.pixelAspect, dur, fps);
        applyCompSettings(c);
        if (parentFolder) { try { c.parentFolder = parentFolder; } catch (e) {} }
        return c;
    }
    function applyCompSettings(c) {
        try {
            c.motionBlur = CFG.comp.motionBlur;
            c.shutterAngle = CFG.comp.shutterAngle;
            c.shutterPhase = CFG.comp.shutterPhase;
            c.motionBlurSamplesPerFrame = CFG.comp.mbSamples;
            c.motionBlurAdaptiveSampleLimit = CFG.comp.mbAdaptiveLimit;
        } catch (e) {}
    }
    function addNull(comp, name) {
        var n = comp.layers.addNull(comp.duration);
        n.name = name;
        return n;
    }
    function addSolid(comp, name, rgb, w, h) {
        var s = comp.layers.addSolid(rgb, name, w || comp.width, h || comp.height, 1.0, comp.duration);
        s.name = name;
        return s;
    }
    function addAdjustment(comp, name) {
        var a = comp.layers.addSolid([0, 0, 0], name, comp.width, comp.height, 1.0, comp.duration);
        a.name = name;
        a.adjustmentLayer = true;
        return a;
    }
    function addEffect(layer, matchName) {
        try { return layer.property("ADBE Effect Parade").addProperty(matchName); }
        catch (e) { warn("effect '" + matchName + "' not addable: " + e.toString()); return null; }
    }
    function markControl(layer) { try { layer.guideLayer = true; layer.shy = true; layer.enabled = true; } catch (e) {} }
    // Atoms are drawn around the layer origin [0,0]; anchor there so position = comp-center
    // places the artwork centered in its atom comp (and spin/pulse pivot on the artwork).
    function anchorAtOrigin(layer) {
        try { layer.transform.anchorPoint.setValue([0, 0]); } catch (e) {}
    }

    // Transform shortcuts (2D/3D tolerant)
    function T(layer) { return layer.property("ADBE Transform Group"); }
    function pPos(layer)    { return T(layer).property("ADBE Position"); }
    function pScale(layer)  { return T(layer).property("ADBE Scale"); }
    function pRot(layer)    { return T(layer).property("ADBE Rotate Z"); }
    function pOpacity(layer){ return T(layer).property("ADBE Opacity"); }
    function pAnchor(layer) { return T(layer).property("ADBE Anchor Point"); }

    // =================================================================================
    //  4. SHAPE CONSTRUCTION HELPERS  [Bible §12.2 shape-first]
    // =================================================================================
    function newShapeLayer(comp, name) {
        var sl = comp.layers.addShape();
        sl.name = name;
        return sl;
    }
    function rootContents(shapeLayer) { return shapeLayer.property("ADBE Root Vectors Group"); }
    function addGroupContents(parentContents, name) {
        var g = parentContents.addProperty("ADBE Vector Group");
        if (name) { try { g.name = name; } catch (e) {} }
        return g.property("ADBE Vectors Group");
    }
    function addStar(contents, points, outerR, innerR, outRound, inRound, type) {
        var star = contents.addProperty("ADBE Vector Shape - Star");
        setParam(star, "ADBE Vector Star Type", type || 1);          // 1 = star, 2 = polygon
        setParam(star, "ADBE Vector Star Points", points);
        setParam(star, "ADBE Vector Star Outer Radius", outerR);
        setParam(star, "ADBE Vector Star Inner Radius", innerR);
        setParam(star, "ADBE Vector Star Outer Roundess", outRound || 0); // AE's spelling
        setParam(star, "ADBE Vector Star Inner Roundess", inRound || 0);
        return star;
    }
    function addEllipse(contents, sx, sy, px, py) {
        var el = contents.addProperty("ADBE Vector Shape - Ellipse");
        setParam(el, "ADBE Vector Ellipse Size", [sx, sy]);
        if (px !== undefined) { setParam(el, "ADBE Vector Ellipse Position", [px, py]); }
        return el;
    }
    function addRect(contents, sx, sy, round, px, py) {
        var r = contents.addProperty("ADBE Vector Shape - Rect");
        setParam(r, "ADBE Vector Rect Size", [sx, sy]);
        setParam(r, "ADBE Vector Rect Roundness", round || 0);
        if (px !== undefined) { setParam(r, "ADBE Vector Rect Position", [px, py]); }
        return r;
    }
    function addFill(contents, rgb, opacity) {
        var fill = contents.addProperty("ADBE Vector Graphic - Fill");
        setParam(fill, "ADBE Vector Fill Color", rgb);
        if (opacity !== undefined) { setParam(fill, "ADBE Vector Fill Opacity", opacity); }
        return fill;
    }
    function addStroke(contents, rgb, width, opacity) {
        var st = contents.addProperty("ADBE Vector Graphic - Stroke");
        setParam(st, "ADBE Vector Stroke Color", rgb);
        setParam(st, "ADBE Vector Stroke Width", width);
        if (opacity !== undefined) { setParam(st, "ADBE Vector Stroke Opacity", opacity); }
        return st;
    }
    function addRepeater(contents, copies, rotationDeg, posX, posY) {
        var rep = contents.addProperty("ADBE Vector Filter - Repeater");
        setParam(rep, "ADBE Vector Repeater Copies", copies);
        try {
            var tr = rep.property("ADBE Vector Repeater Transform");
            setParam(tr, "ADBE Vector Repeater Rotation", rotationDeg);
            if (posX !== undefined) { setParam(tr, "ADBE Vector Repeater Position", [posX, posY]); }
        } catch (e) { warn("repeater transform: " + e.toString()); }
        return rep;
    }
    // Parametric heart path (polygonal sampling, smooth enough at scene scale) [Bible §4 S07]
    function addHeartPath(contents, size) {
        var pathGroup = contents.addProperty("ADBE Vector Shape - Group");
        var pathProp = pathGroup.property("ADBE Vector Shape");
        var N = 64, verts = [], inT = [], outT = [];
        var s = size / 34.0;
        for (var i = 0; i < N; i++) {
            var t = (i / N) * Math.PI * 2;
            var x = 16 * Math.pow(Math.sin(t), 3);
            var y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            verts.push([x * s, -y * s]);       // negate y: math-up -> AE-down
            inT.push([0, 0]); outT.push([0, 0]);
        }
        var shp = new Shape();
        shp.vertices = verts; shp.inTangents = inT; shp.outTangents = outT; shp.closed = true;
        trySet(pathProp, shp);
        return pathGroup;
    }

    // =================================================================================
    //  5. PLUGIN DETECTION  — best-effort, multi-candidate; never fails.  [Bible §15.2, §20 R7]
    // =================================================================================
    var PLUGINS = { deepGlow: null, particular: null, form: null, opticalFlares: null,
                    sapphire: null, universe: null, element3d: null, fastBokeh: null,
                    report: [] };
    function detectPlugins() {
        var probe = app.project.items.addComp("__SR_PLUGIN_PROBE__", 16, 16, 1, 1, 30);
        var sol = probe.layers.addSolid([0, 0, 0], "probe", 16, 16, 1);
        function firstAvailable(candidates) {
            for (var i = 0; i < candidates.length; i++) {
                try {
                    var e = sol.property("ADBE Effect Parade").addProperty(candidates[i]);
                    if (e) { e.remove(); return candidates[i]; }
                } catch (err) {}
            }
            return null;
        }
        PLUGINS.deepGlow      = firstAvailable(["DeepGlow", "VC Deep Glow", "PYT_DeepGlow", "Deep Glow"]);
        PLUGINS.particular    = firstAvailable(["Trapcode Particular", "TC Particular 5", "TC Particular", "RG Trapcode Particular"]);
        PLUGINS.form          = firstAvailable(["Trapcode Form", "TC Form", "RG Trapcode Form"]);
        PLUGINS.opticalFlares = firstAvailable(["VC Optical Flares", "OpticalFlares", "VideoCopilot Optical Flares"]);
        PLUGINS.sapphire      = firstAvailable(["ISL7GlowAF", "S_Glow", "Sapphire Glow"]);
        PLUGINS.universe      = firstAvailable(["RG Universe Glow", "Universe Glow"]);
        PLUGINS.element3d     = firstAvailable(["VC Element", "Element"]);
        PLUGINS.fastBokeh     = firstAvailable(["RO FastBokeh", "Fast Bokeh Pro", "RO Fast Bokeh"]);
        try { probe.remove(); } catch (e) {}

        function status(label, mn) { PLUGINS.report.push(label + ": " + (mn ? ("FOUND (" + mn + ")") : "not found -> built-in fallback")); }
        status("Deep Glow", PLUGINS.deepGlow);
        status("Trapcode Particular", PLUGINS.particular);
        status("Trapcode Form", PLUGINS.form);
        status("Optical Flares", PLUGINS.opticalFlares);
        status("Sapphire Glow", PLUGINS.sapphire);
        status("Universe Glow", PLUGINS.universe);
        status("Element 3D", PLUGINS.element3d);
        status("Fast Bokeh Pro", PLUGINS.fastBokeh);
        log("Plugin scan complete.");
    }

    // Bloom: Deep Glow if present, else stacked built-in Glow (ADBE Glo2) + Levels threshold. [Bible §14, §15.1]
    function applyBloom(layer, intensityExprHost, tag) {
        if (PLUGINS.deepGlow) {
            var dg = addEffect(layer, PLUGINS.deepGlow);
            if (dg) { log("Bloom(" + tag + "): Deep Glow"); return dg; }
        }
        // Built-in fallback: two Glows (small + large radius) for HDR-ish falloff.
        var g1 = addEffect(layer, "ADBE Glo2");
        setParam(g1, "ADBE Glo2-0002", 60);   // Glow Radius (approx index/name tolerant)
        setParam(g1, "Glow Radius", 60);
        setParam(g1, "Glow Threshold", 45);
        setParam(g1, "Glow Intensity", 1.0);
        var g2 = addEffect(layer, "ADBE Glo2");
        setParam(g2, "Glow Radius", 160);
        setParam(g2, "Glow Threshold", 55);
        setParam(g2, "Glow Intensity", 0.6);
        log("Bloom(" + tag + "): built-in Glow x2 fallback");
        return g1;
    }

    // =================================================================================
    //  6. EXPRESSION LIBRARY  — reusable looping rigs, all read from controllers. [Bible §16]
    //     Instance variation constants are BAKED at build time (deterministic, cheaper
    //     than per-frame seedRandom) — honoring the spec's seeded-variation intent. [Bible §16.2]
    // =================================================================================
    //  MASTERREF: controllers live in the MASTER comp, but most expressions run INSIDE
    //  system precomps where `thisComp` != master. Resolve controllers via comp(name)
    //  so every rig reads the same source of truth from anywhere. [Bible §13.2, §16.1]
    var MASTERREF = 'comp("MASTER_' + CFG.project.name + '_1080p")';

    var EXPR = {
        header:
            'var G = ' + MASTERREF + '.layer("CTRL_Global");\n' +
            'var spd = G.effect("Master Drift Speed")("Slider");\n' +
            'var amp = G.effect("Master Amplitude")("Slider")/100;\n',

        // Float on Position (2D). T=period sec, A=amplitude px, ph=phase rad.
        floatPos: function (T, A, ph) {
            return this.header +
                'var Tp=' + T + '; var A=' + A + '; var ph=' + ph + ';\n' +
                'var y = value[1] + Math.sin(time*2*Math.PI/Tp*spd + ph)*A*amp;\n' +
                '[value[0], y];';
        },
        // Float + lateral drift on Position (2D).
        driftPos: function (Tx, Ax, Ty, Ay, ph) {
            return this.header +
                'var Tx=' + Tx + ',Ax=' + Ax + ',Ty=' + Ty + ',Ay=' + Ay + ',ph=' + ph + ';\n' +
                'var x = value[0] + Math.sin(time*2*Math.PI/Tx*spd + ph)*Ax*amp;\n' +
                'var y = value[1] + Math.sin(time*2*Math.PI/Ty*spd + ph*1.3)*Ay*amp;\n' +
                '[x, y];';
        },
        // Breathe on Scale. base=percent, d=delta percent, T=period.
        breathe: function (base, d, T, ph) {
            return this.header +
                'var b=' + base + ',d=' + d + ',Tp=' + T + ',ph=' + (ph || 0) + ';\n' +
                'var s=b + Math.sin(time*2*Math.PI/Tp*spd + ph)*d*amp;\n' +
                '[s,s];';
        },
        // Continuous looped spin (deg). ratePerSec chosen so rate*loopDur = integer revs.
        spin: function (ratePerSec) {
            return this.header + 'time*' + ratePerSec + '*spd;';
        },
        // Wobble spin (deg) +/- A.
        wobble: function (A, T, ph) {
            return this.header +
                'var A=' + A + ',Tp=' + T + ',ph=' + (ph || 0) + ';\n' +
                'value + Math.sin(time*2*Math.PI/Tp*spd + ph)*A*amp;';
        },
        // Twinkle: scale 0->max->0 and opacity, looped, seeded phase. returns {scale, opacity}
        twinkleScale: function (mx, rate, seed) {
            return this.header +
                'var mx=' + mx + ',rate=' + rate + ',seed=' + seed + ';\n' +
                'var k=Math.sin(((time*rate*spd+seed)%1)*Math.PI); k=Math.max(k,0);\n' +
                '[k*mx,k*mx];';
        },
        twinkleOpacity: function (rate, seed) {
            return this.header +
                'var rate=' + rate + ',seed=' + seed + ';\n' +
                'var k=Math.sin(((time*rate*spd+seed)%1)*Math.PI); Math.max(k,0)*100;';
        },
        // Glow pulse -> intensity multiplier. lo/hi and Master Glow.
        glowPulse: function (lo, hi, T) {
            return this.header +
                'var gl=G.effect("Master Glow")("Slider")/100;\n' +
                'var lo=' + lo + ',hi=' + hi + ',Tp=' + T + ';\n' +
                '(lo + (Math.sin(time*2*Math.PI/Tp*spd)*0.5+0.5)*(hi-lo))*gl;';
        },
        // Opacity linked to Master Glow (for additive light passes).
        opacityGlow: function (base) {
            return 'var G=' + MASTERREF + '.layer("CTRL_Global");\n' +
                   'var gl=G.effect("Master Glow")("Slider")/100;\n' + base + '*gl;';
        },
        // Palette pick -> a Fill/Tint color from CTRL_Global.
        paletteColor: function (colorCtrlName) {
            return '' + MASTERREF + '.layer("CTRL_Global").effect("' + colorCtrlName + '")("Color");';
        },
        // Decoration density gate on opacity (0..100 * density/100).
        densityOpacity: function (base) {
            return 'var G=' + MASTERREF + '.layer("CTRL_Global");\n' +
                   'var den=G.effect("Decoration Density")("Slider")/100;\n' + base + '*den;';
        },
        // Fractal Noise evolution for star twinkle.
        evolve: function (ratePerSec) {
            return 'time*' + ratePerSec + '*' + MASTERREF + '.layer("CTRL_Global").effect("Master Drift Speed")("Slider");';
        },
        // Plane Z from Parallax Depth control. baseZ literal.
        planeZ: function (baseZ) {
            return 'var G=' + MASTERREF + '.layer("CTRL_Global");\n' +
                   'var d=G.effect("Parallax Depth")("Slider")/100;\n' +
                   '[value[0], value[1], ' + baseZ + '*d];';
        },
        // Camera Lissajous drift from CTRL_Camera. bx,by,bz base position.
        cameraDrift: function (bx, by, bz) {
            return 'var C=' + MASTERREF + '.layer("CTRL_Camera");\n' +
                   'var ax=C.effect("Drift Amp X")("Slider"),ay=C.effect("Drift Amp Y")("Slider");\n' +
                   'var pz=C.effect("Push Amount")("Slider");\n' +
                   'var Tx=C.effect("Drift Period X")("Slider"),Ty=C.effect("Drift Period Y")("Slider"),Tz=C.effect("Drift Period Z")("Slider");\n' +
                   'var x=' + bx + '+Math.sin(time*2*Math.PI/Tx)*ax;\n' +
                   'var y=' + by + '+Math.sin(time*2*Math.PI/Ty + Math.PI/3)*ay;\n' +
                   'var z=' + bz + '+Math.sin(time*2*Math.PI/Tz)*pz;\n' +
                   '[x,y,z];';
        },
        // Camera focus locked to hero plane distance. [Bible §7.4]
        focusLock:
            'var C=' + MASTERREF + '.layer("CTRL_Camera");\n' +
            'var dof=C.effect("DOF Amount")("Slider");\n' +
            'var pm=' + MASTERREF + '.layer("CTRL_Global").effect("Preview Mode")("Checkbox");\n' +
            'try{ var hero=' + MASTERREF + '.layer("NULL_Plane_Hero").toWorld([0,0,0]);\n' +
            '     length(position, hero); }catch(e){ value; }',
        // Camera blur level gated by Preview Mode (0 in preview) and DOF Amount. [Bible §17.4]
        blurLevel:
            'var C=' + MASTERREF + '.layer("CTRL_Camera");\n' +
            'var dof=C.effect("DOF Amount")("Slider");\n' +
            'var pm=' + MASTERREF + '.layer("CTRL_Global").effect("Preview Mode")("Checkbox");\n' +
            'pm>0 ? 0 : dof;',
        // Ribbon wave sample for a daisy at base x. [Bible §16.4]
        ribbonRide: function (baseX, baseY, A, wavelength, T) {
            return 'var G=' + MASTERREF + '.layer("CTRL_Global");\n' +
                   'var amp=G.effect("Master Amplitude")("Slider")/100;\n' +
                   'var spd=G.effect("Master Drift Speed")("Slider");\n' +
                   'var A=' + A + ',wl=' + wavelength + ',Tp=' + T + ',x=' + baseX + ',y0=' + baseY + ';\n' +
                   'var yw=A*Math.sin((x/wl)*2*Math.PI + time*2*Math.PI/Tp*spd)*amp;\n' +
                   '[x, y0+yw];';
        },
        // Maintain stroke width under camera scale (from scripts-repo pattern). [Bible §16.2]
        maintainStroke:
            'var s=length(toComp([0,0]),toComp([0.7071,0.7071])); (s)? value/s : value;',
        // Dashed offset scroll (loops if rate*loopDur is integer * dashLen).
        dashScroll: function (ratePerSec) {
            return 'time*' + ratePerSec + '*' + MASTERREF + '.layer("CTRL_Global").effect("Master Drift Speed")("Slider");';
        },
        // Twinkle opacity WITH density gate, in one expression (seeded, looped).
        twinkleOpacityDensity: function (rate, seed) {
            return 'var M=' + MASTERREF + ';\n' +
                   'var spd=M.layer("CTRL_Global").effect("Master Drift Speed")("Slider");\n' +
                   'var den=M.layer("CTRL_Global").effect("Decoration Density")("Slider")/100;\n' +
                   'var rate=' + rate + ',seed=' + seed + ';\n' +
                   'var k=Math.sin(((time*rate*spd+seed)%1)*Math.PI); Math.max(k,0)*100*den;';
        },
        // Expression-based 2.5D parallax: offsets a full-frame 2D card opposite to the
        // camera's animated drift, scaled by the plane factor and Parallax Depth. This
        // realizes the depth read of Bible §9.2 while preserving full-frame coverage and
        // authored layouts (literal z-parenting of 2D cards is transform-degenerate). cx,cy = comp center.
        parallax: function (factor, cx, cy) {
            return 'var M=' + MASTERREF + ';\n' +
                   'var C=M.layer("CAM_Main");\n' +
                   'var d=M.layer("CTRL_Global").effect("Parallax Depth")("Slider")/100;\n' +
                   'var f=' + factor + '*d;\n' +
                   'var ox=(C.transform.position[0]-' + cx + ')*f;\n' +
                   'var oy=(C.transform.position[1]-' + cy + ')*f;\n' +
                   '[value[0]-ox, value[1]-oy];';
        }
    };

    // =================================================================================
    //  7. CONTROLLER BUILDERS  [Bible §13, Appendix C]
    // =================================================================================
    function addSlider(host, name, value) {
        var e = addEffect(host, "ADBE Slider Control");
        if (e) { e.name = name; setParam(e, "ADBE Slider Control-0001", value); setParam(e, "Slider", value); }
        return e;
    }
    function addColorControl(host, name, hex) {
        var e = addEffect(host, "ADBE Color Control");
        if (e) { e.name = name; var rgb = hexToRGB(hex); setParam(e, "ADBE Color Control-0001", rgb); setParam(e, "Color", rgb); }
        return e;
    }
    function addCheckbox(host, name, val) {
        var e = addEffect(host, "ADBE Checkbox Control");
        if (e) { e.name = name; setParam(e, "ADBE Checkbox Control-0001", val); setParam(e, "Checkbox", val); }
        return e;
    }
    function addLayerControl(host, name) {
        var e = addEffect(host, "ADBE Layer Control");
        if (e) { e.name = name; }
        return e;
    }

    function buildControllers(master) {
        // ---- CTRL_Global ----
        var g = addNull(master, "CTRL_Global");
        markControl(g);
        // Palette color controls (named exactly per Appendix C)
        addColorControl(g, "Color_BG_Deep",      CFG.palette.BG_Deep);
        addColorControl(g, "Color_BG_Mid",       CFG.palette.BG_Mid);
        addColorControl(g, "Color_BG_Glow",      CFG.palette.BG_Glow);
        addColorControl(g, "Color_Pink_Hot",     CFG.palette.Pink_Hot);
        addColorControl(g, "Color_Pink_Light",   CFG.palette.Pink_Light);
        addColorControl(g, "Color_Pink_Pale",    CFG.palette.Pink_Pale);
        addColorControl(g, "Color_Magenta_Deep", CFG.palette.Magenta_Deep);
        addColorControl(g, "Color_Star_Cream",   CFG.palette.Star_Cream);
        addColorControl(g, "Color_Yellow",       CFG.palette.Yellow);
        addColorControl(g, "Color_Teal",         CFG.palette.Teal);
        addColorControl(g, "Color_Lavender",     CFG.palette.Lavender);
        addColorControl(g, "Color_White",        CFG.palette.White);
        // Master sliders / switches
        addSlider(g,   "Master Glow",        100);
        addSlider(g,   "Master Drift Speed", 1.0);
        addSlider(g,   "Master Amplitude",   100);
        addSlider(g,   "Decoration Density", 100);
        addSlider(g,   "Parallax Depth",     100);
        addCheckbox(g, "Preview Mode",       0);
        addSlider(g,   "Format",             0); // 0=16:9,1=9:16,2=1:1 (dropdown emulated as slider for script-safety)

        // ---- CTRL_Camera ----
        var c = addNull(master, "CTRL_Camera");
        markControl(c);
        addSlider(c, "Drift Amp X",   CFG.camera.driftAmpX);
        addSlider(c, "Drift Amp Y",   CFG.camera.driftAmpY);
        addSlider(c, "Drift Period X", CFG.camera.driftPeriodX);
        addSlider(c, "Drift Period Y", CFG.camera.driftPeriodY);
        addSlider(c, "Drift Period Z", CFG.camera.driftPeriodZ);
        addSlider(c, "Push Amount",   CFG.camera.pushZ);
        addSlider(c, "DOF Amount",    CFG.camera.dofAmount);
        addLayerControl(c, "Focus Target");

        return { global: g, camera: c };
    }

    // =================================================================================
    //  8. SOURCE ATOM BUILDERS  (built once, instanced everywhere)  [Bible §10.1 sources]
    // =================================================================================
    function buildAtom_Daisy(folder) {
        var c = getOrCreateComp("PRE_Daisy", 180, 180, CFG.comp.durationSec, CFG.comp.fps, folder);
        var sl = newShapeLayer(c, "SH_Daisy");
        var root = rootContents(sl);
        // petals: one ellipse offset up, repeated 5x around center
        var petals = addGroupContents(root, "Petals");
        addEllipse(petals, 46, 62, 0, -38);
        addFill(petals, hexToRGB(CFG.palette.White));
        addRepeater(petals, 5, 72, 0, 0);
        // center
        var core = addGroupContents(root, "Core");
        addEllipse(core, 40, 40, 0, 0);
        addFill(core, hexToRGB(CFG.palette.Pink_Pale));
        anchorAtOrigin(sl);
        sl.transform.position.setValue([90, 90]);
        var glow = addEffect(sl, "ADBE Glo2");
        setParam(glow, "Glow Radius", 18); setParam(glow, "Glow Intensity", 0.5);
        return c;
    }
    function buildAtom_Heart(folder) {
        var c = getOrCreateComp("PRE_Heart", 300, 300, CFG.comp.durationSec, CFG.comp.fps, folder);
        var sl = newShapeLayer(c, "SH_Heart");
        var root = rootContents(sl);
        // body
        var body = addGroupContents(root, "Body");
        addHeartPath(body, 120);
        addFill(body, hexToRGB(CFG.palette.Pink_Hot));
        // shadow (magenta, lower-right, multiply-ish via low opacity dark)
        var shad = addGroupContents(root, "Shadow");
        addEllipse(shad, 150, 130, 26, 30);
        addFill(shad, hexToRGB(CFG.palette.Magenta_Deep), 40);
        // specular highlight (white soft ellipse, upper-left, Screen)
        var spec = newShapeLayer(c, "SH_Heart_Spec");
        var sroot = rootContents(spec);
        var sg = addGroupContents(sroot, "Spec");
        addEllipse(sg, 34, 24, -22, -30);
        addFill(sg, hexToRGB(CFG.palette.White));
        spec.blendingMode = BlendingMode.SCREEN;
        var sb = addEffect(spec, "ADBE Box Blur2"); setParam(sb, "ADBE Box Blur2-0001", 8); setParam(sb, "Blur Radius", 8);
        // positions & glow
        anchorAtOrigin(sl); sl.transform.position.setValue([150, 150]);
        anchorAtOrigin(spec); spec.transform.position.setValue([150, 150]);
        var glow = addEffect(sl, "ADBE Glo2");
        setParam(glow, "Glow Radius", 30); setParam(glow, "Glow Intensity", 0.7);
        return c;
    }
    function buildAtom_StarSmall(folder) {
        var c = getOrCreateComp("PRE_StarSmall", 160, 160, CFG.comp.durationSec, CFG.comp.fps, folder);
        var sl = newShapeLayer(c, "SH_Star");
        var root = rootContents(sl);
        var g = addGroupContents(root, "Star");
        addStar(g, 5, 56, 24, 18, 10, 1);        // rounded 5-point star
        addFill(g, hexToRGB(CFG.palette.Yellow)); // default; recolored per-instance
        anchorAtOrigin(sl); sl.transform.position.setValue([80, 80]);
        var glow = addEffect(sl, "ADBE Glo2");
        setParam(glow, "Glow Radius", 22); setParam(glow, "Glow Intensity", 0.6);
        return c;
    }
    function buildAtom_Sparkle(folder) {
        var c = getOrCreateComp("PRE_Sparkle", 120, 120, CFG.comp.durationSec, CFG.comp.fps, folder);
        var sl = newShapeLayer(c, "SH_Sparkle");
        var root = rootContents(sl);
        var g = addGroupContents(root, "Sparkle");
        addStar(g, 4, 46, 7, 0, 0, 1);           // 4-point pinched twinkle
        addFill(g, hexToRGB(CFG.palette.White));
        // bright core
        var core = addGroupContents(root, "Core");
        addEllipse(core, 10, 10, 0, 0);
        addFill(core, hexToRGB(CFG.palette.White));
        anchorAtOrigin(sl); sl.transform.position.setValue([60, 60]);
        sl.blendingMode = BlendingMode.ADD;
        var glow = addEffect(sl, "ADBE Glo2");
        setParam(glow, "Glow Radius", 16); setParam(glow, "Glow Intensity", 0.9);
        return c;
    }
    function buildAtom_Bokeh(folder) {
        var c = getOrCreateComp("PRE_Bokeh", 200, 200, CFG.comp.durationSec, CFG.comp.fps, folder);
        var sl = newShapeLayer(c, "SH_Bokeh");
        var root = rootContents(sl);
        var g = addGroupContents(root, "Bokeh");
        addEllipse(g, 150, 150, 0, 0);
        addStroke(g, hexToRGB(CFG.palette.Pink_Pale), 10, 60);
        addFill(g, hexToRGB(CFG.palette.Pink_Pale), 20);
        anchorAtOrigin(sl); sl.transform.position.setValue([100, 100]);
        var blur = addEffect(sl, "ADBE Box Blur2"); setParam(blur, "Blur Radius", 18);
        return c;
    }
    function buildAtom_Orb(folder) {
        var c = getOrCreateComp("PRE_Orb", 160, 160, CFG.comp.durationSec, CFG.comp.fps, folder);
        var sl = newShapeLayer(c, "SH_Orb");
        var root = rootContents(sl);
        var g = addGroupContents(root, "Orb");
        addEllipse(g, 90, 90, 0, 0);
        addFill(g, hexToRGB(CFG.palette.Teal));
        var spec = addGroupContents(root, "Spec");
        addEllipse(spec, 22, 16, -18, -20);
        addFill(spec, hexToRGB(CFG.palette.White), 80);
        anchorAtOrigin(sl); sl.transform.position.setValue([80, 80]);
        var glow = addEffect(sl, "ADBE Glo2");
        setParam(glow, "Glow Radius", 18); setParam(glow, "Glow Intensity", 0.5);
        return c;
    }

    // =================================================================================
    //  9. VISUAL SYSTEM BUILDERS  S01..S12  [Bible §4]
    // =================================================================================

    // --- S01 Background Cosmos ---
    function buildS01(folder) {
        var W = Math.round(CFG.comp.width * CFG.comp.bgOversizePct / 100);
        var H = Math.round(CFG.comp.height * CFG.comp.bgOversizePct / 100);
        var c = getOrCreateComp("PRE_S01_BG_Cosmos", W, H, CFG.comp.durationSec, CFG.comp.fps, folder);
        // base radial violet gradient + vignette
        var base = addSolid(c, "SOL_Void", hexToRGB(CFG.palette.BG_Mid), W, H);
        var ramp = addEffect(base, "ADBE Ramp");
        setParam(ramp, "Start of Ramp", [W / 2, H * 0.42]);
        setParam(ramp, "Start Color", hexToRGB(CFG.palette.BG_Glow));
        setParam(ramp, "End of Ramp", [W / 2, H]);
        setParam(ramp, "End Color", hexToRGB(CFG.palette.BG_Deep));
        setParam(ramp, "Ramp Shape", 2); // radial
        exprParam(ramp, "Start Color", EXPR.paletteColor("Color_BG_Glow"));
        exprParam(ramp, "End Color",   EXPR.paletteColor("Color_BG_Deep"));
        // star-field (Fractal Noise, high contrast sparse) on Screen
        var stars = addSolid(c, "SOL_Stars", [0, 0, 0], W, H);
        stars.blendingMode = BlendingMode.SCREEN;
        var fn = addEffect(stars, "ADBE Fractal Noise");
        setParam(fn, "Contrast", 640); setParam(fn, "Brightness", -160);
        setParam(fn, "Complexity", 2);
        enableCycleEvolution(fn, 1);                 // wrap evolution at 1 revolution for a seamless loop
        tryExpr(fnEvolution(fn), EXPR.evolve(36));   // 36 deg/s * 10s = 360deg = exactly 1 cycle
        // nebula clouds (second Fractal Noise, low opacity)
        var neb = addSolid(c, "SOL_NebulaClouds", [0, 0, 0], W, H);
        neb.blendingMode = BlendingMode.SCREEN; neb.transform.opacity.setValue(22);
        var fn2 = addEffect(neb, "ADBE Fractal Noise");
        setParam(fn2, "Contrast", 130); setParam(fn2, "Brightness", -30);
        enableCycleEvolution(fn2, 2);                // 2 revolutions -> also seamless
        tryExpr(fnEvolution(fn2), EXPR.evolve(72));
        var tint = addEffect(neb, "ADBE Tint");
        setParam(tint, "Map White To", hexToRGB(CFG.palette.BG_Glow));
        // faint halftone dot texture
        var dots = newShapeLayer(c, "SH_Dots");
        var droot = rootContents(dots);
        var dg = addGroupContents(droot, "Dot");
        addEllipse(dg, 6, 6, 0, 0);
        addFill(dg, hexToRGB(CFG.palette.Lavender));
        addRepeater(dg, 42, 0, 48, 0);   // horizontal row of dots
        addRepeater(dg, 28, 0, 0, 48);   // repeat the row vertically -> halftone grid
        dots.transform.opacity.setValue(6);
        dots.blendingMode = BlendingMode.OVERLAY;
        return c;
    }
    function fnEvolution(fnEffect) {
        try { return fnEffect.property("Evolution"); } catch (e) { return null; }
    }
    function enableCycleEvolution(fnEffect, revs) {
        try {
            var eo = fnEffect.property("Evolution Options");
            trySet(eo.property("Cycle Evolution"), 1);
            trySet(eo.property("Cycle (in Revolutions)"), revs);
        } catch (e) { warn("cycle evolution: " + e.toString()); }
    }

    // --- S02 Nebula Light Streak ---
    function buildS02(folder) {
        var c = getOrCreateComp("PRE_S02_Nebula", CFG.comp.width, CFG.comp.height, CFG.comp.durationSec, CFG.comp.fps, folder);
        var s = addSolid(c, "SOL_NebulaStreak", hexToRGB(CFG.palette.Pink_Light), CFG.comp.width, CFG.comp.height);
        s.blendingMode = BlendingMode.ADD;
        var ramp = addEffect(s, "ADBE Ramp");
        setParam(ramp, "Start of Ramp", [520, 300]);
        setParam(ramp, "Start Color", hexToRGB(CFG.palette.Pink_Light));
        setParam(ramp, "End of Ramp", [1400, 760]);
        setParam(ramp, "End Color", [0, 0, 0]);
        setParam(ramp, "Ramp Shape", 2);
        var blur = addEffect(s, "ADBE Box Blur2"); setParam(blur, "Blur Radius", 220); setParam(blur, "Iterations", 3);
        s.transform.rotation.setValue(-22);
        tryExpr(s.transform.opacity, EXPR.opacityGlow("36"));
        return c;
    }

    // --- S03 Wish-Star + Halo ---
    function buildS03(folder) {
        var c = getOrCreateComp("PRE_S03_WishStar", 900, 900, CFG.comp.durationSec, CFG.comp.fps, folder);
        // halo ring (behind)
        var halo = newShapeLayer(c, "SH_Halo");
        var hr = rootContents(halo);
        var hg = addGroupContents(hr, "Halo");
        addEllipse(hg, 560, 150, 0, 0);
        addStroke(hg, hexToRGB(CFG.palette.Star_Cream), 12, 70);
        anchorAtOrigin(halo); halo.transform.position.setValue([450, 450]);
        halo.blendingMode = BlendingMode.ADD;
        var hglow = addEffect(halo, "ADBE Glo2"); setParam(hglow, "Glow Radius", 40); setParam(hglow, "Glow Intensity", 1.0);
        tryExpr(halo.transform.rotation, EXPR.wobble(4, 10, 0)); // seamless sine wobble (continuous spin would pop at loop)
        // star body
        var star = newShapeLayer(c, "SH_WishStar");
        var sr = rootContents(star);
        var sg = addGroupContents(sr, "Star");
        addStar(sg, 5, 190, 82, 40, 6, 1);
        addFill(sg, hexToRGB(CFG.palette.Star_Cream));
        var core = addGroupContents(sr, "Core");
        addEllipse(core, 60, 60, 0, 0);
        addFill(core, hexToRGB(CFG.palette.White));
        anchorAtOrigin(star); star.transform.position.setValue([450, 450]);
        var glowMain = applyBloom(star, null, "WishStar");
        var glow2 = addEffect(star, "ADBE Glo2"); setParam(glow2, "Glow Radius", 80); setParam(glow2, "Glow Intensity", 1.2);
        exprParam(glow2, "Glow Intensity", EXPR.glowPulse(0.9, 1.6, 5));
        tryExpr(star.transform.scale, EXPR.breathe(100, 3, 5, 0));
        return c;
    }

    // --- S04 Flower-Ribbon Banner ---
    function buildS04(folder, daisyComp) {
        var W = Math.round(CFG.comp.width * CFG.comp.bgOversizePct / 100);
        var c = getOrCreateComp("PRE_S04_Ribbon", W, 700, CFG.comp.durationSec, CFG.comp.fps, folder);
        var A = 90, wavelength = 640, T = 10, yCenter = 350;
        // ribbon body: a thick stroked sine path
        var ribbon = newShapeLayer(c, "SH_Ribbon");
        var rroot = rootContents(ribbon);
        var rg = addGroupContents(rroot, "RibbonPath");
        var pathGroup = rg.addProperty("ADBE Vector Shape - Group");
        var pathProp = pathGroup.property("ADBE Vector Shape");
        var verts = [], inT = [], outT = [], N = 48;
        for (var i = 0; i <= N; i++) {
            var x = (i / N) * W;
            var y = yCenter + A * Math.sin((x / wavelength) * 2 * Math.PI);
            verts.push([x, y]); inT.push([-40, 0]); outT.push([40, 0]);
        }
        var rshape = new Shape(); rshape.vertices = verts; rshape.inTangents = inT; rshape.outTangents = outT; rshape.closed = false;
        trySet(pathProp, rshape);
        var stroke = addStroke(rg, hexToRGB(CFG.palette.Pink_Hot), 96, 100);
        // keep ribbon thickness visually constant under any camera scale (scripts-repo rig) [Bible §16.2]
        try { tryExpr(stroke.property("ADBE Vector Stroke Width"), EXPR.maintainStroke); } catch (e) {}
        // satin highlight (thinner, lighter, screen, offset up)
        var hi = newShapeLayer(c, "SH_Ribbon_Highlight");
        var hroot = rootContents(hi);
        var hg = addGroupContents(hroot, "HL");
        var hpg = hg.addProperty("ADBE Vector Shape - Group");
        trySet(hpg.property("ADBE Vector Shape"), rshape);
        addStroke(hg, hexToRGB(CFG.palette.Pink_Light), 28, 90);
        hi.transform.position.setValue([0, -26]);
        hi.blendingMode = BlendingMode.SCREEN;
        // animate wave: drive both ribbon + highlight via a phase expression on Path? Path expr is heavy;
        // instead we ride daisies on the wave and gently bob the ribbon group vertically for life.
        tryExpr(ribbon.transform.position, EXPR.floatPos(T, 6, 0));
        tryExpr(hi.transform.position, EXPR.floatPos(T, 6, 0));
        // daisies riding the wave
        var startX = (W - 1920) / 2 + 120;
        for (var d = 0; d < CFG.counts.daisies; d++) {
            var dl = c.layers.add(daisyComp);
            dl.name = "Daisy_" + (d + 1);
            var bx = startX + d * ((1920 - 240) / (CFG.counts.daisies - 1));
            var by = yCenter + A * Math.sin((bx / wavelength) * 2 * Math.PI);
            var sc = rndRange(70, 100);
            dl.transform.scale.setValue([sc, sc]);
            tryExpr(dl.transform.position, EXPR.ribbonRide(bx, by, A, wavelength, T));
            tryExpr(dl.transform.rotation, EXPR.wobble(6, loopPeriod(4, 7), rndRange(0, 6)));
        }
        return c;
    }

    // --- S05 Character (asset if present, else placeholder silhouette)  [Bible §4 S05, §20 R1] ---
    function buildS05(folder, assetsFolder) {
        var c = getOrCreateComp("PRE_S05_Character", 800, 1200, CFG.comp.durationSec, CFG.comp.fps, folder);
        var imported = importCharacterAsset(assetsFolder);
        var body;
        if (imported) {
            body = c.layers.add(imported);
            body.name = "IMG_Character_Doll";
            body.transform.position.setValue([400, 620]);
        } else {
            warn("Character art not found -> building placeholder silhouette (per Bible R1). Replace 30_ASSETS/31_Character/IMG_Character_Doll.png");
            body = buildCharacterPlaceholder(c);
        }
        // anchor at feet/contact point for breathe + float glued to floor  [Bible §12.3]
        try {
            var b = body.sourceRectAtTime(0, false);
            body.transform.anchorPoint.setValue([b.left + b.width / 2, b.top + b.height]);
            body.transform.position.setValue([400, 1120]);
        } catch (e) {}
        // idle: float + breathe (loop-safe periods)
        tryExpr(body.transform.position, EXPR.floatPos(5, 4, 0));
        tryExpr(body.transform.scale, EXPR.breathe(100, 0.5, 2.5, 0));
        // cool rim pass (scriptable rim, screen, blurred) — only for placeholder build  [Bible §6.3]
        if (!imported) { buildCharacterPlaceholder(c, true); }
        return c;
    }
    function importCharacterAsset(assetsFolder) {
        var candidates = [
            Folder(app.project.file ? app.project.file.parent.fsName : Folder.desktop.fsName).fsName + "/IMG_Character_Doll.png",
            Folder.desktop.fsName + "/IMG_Character_Doll.png"
        ];
        for (var i = 0; i < candidates.length; i++) {
            var f = new File(candidates[i]);
            if (f.exists) {
                try {
                    var io = new ImportOptions(f);
                    var it = app.project.importFile(io);
                    try { it.parentFolder = assetsFolder; } catch (e) {}
                    log("Character asset imported: " + f.fsName);
                    return it;
                } catch (e) { warn("character import failed: " + e.toString()); }
            }
        }
        return null;
    }
    function buildCharacterPlaceholder(c, isRim) {
        var sl = newShapeLayer(c, isRim ? "SH_Character_Rim" : "SH_Character_Placeholder");
        var root = rootContents(sl);
        // torso/dress (rounded trapezoid via rounded rect), head (ellipse), simple legs
        var dress = addGroupContents(root, "Dress");
        addRect(dress, 180, 300, 60, 0, 60);
        addFill(dress, hexToRGB(isRim ? CFG.palette.Lavender : CFG.palette.Pink_Pale));
        var head = addGroupContents(root, "Head");
        addEllipse(head, 120, 130, 0, -170);
        addFill(head, hexToRGB(isRim ? CFG.palette.Lavender : CFG.palette.Pink_Pale));
        var hair = addGroupContents(root, "Hair");
        addEllipse(hair, 150, 160, 0, -160);
        addFill(hair, hexToRGB(CFG.palette.BG_Mid), isRim ? 0 : 80);
        anchorAtOrigin(sl);
        sl.transform.position.setValue([400, 560]);
        if (isRim) {
            sl.blendingMode = BlendingMode.SCREEN;
            var blur = addEffect(sl, "ADBE Box Blur2"); setParam(blur, "Blur Radius", 24);
            sl.transform.opacity.setValue(50);
        }
        return sl;
    }

    // --- S06 Reflection Floor  [Bible §4 S06] ---
    function buildS06(folder, characterComp) {
        var c = getOrCreateComp("PRE_S06_Reflection", 900, 900, CFG.comp.durationSec, CFG.comp.fps, folder);
        // floor base with sheen + horizon glow
        var floor = addSolid(c, "SOL_Floor", hexToRGB(CFG.palette.BG_Deep), 900, 900);
        var fr = addEffect(floor, "ADBE Ramp");
        setParam(fr, "Start of Ramp", [450, 0]); setParam(fr, "Start Color", hexToRGB(CFG.palette.BG_Mid));
        setParam(fr, "End of Ramp", [450, 900]); setParam(fr, "End Color", hexToRGB(CFG.palette.BG_Deep));
        setParam(fr, "Ramp Shape", 1);
        var horizon = newShapeLayer(c, "SH_HorizonGlow");
        var hgr = rootContents(horizon); var hgg = addGroupContents(hgr, "Line");
        addRect(hgg, 900, 6, 3, 0, 0); addFill(hgg, hexToRGB(CFG.palette.Pink_Light));
        horizon.transform.position.setValue([450, 20]); horizon.blendingMode = BlendingMode.ADD;
        var hglow = addEffect(horizon, "ADBE Glo2"); setParam(hglow, "Glow Radius", 40);
        // mirrored character
        var refl = c.layers.add(characterComp);
        refl.name = "Reflection_Character";
        refl.transform.scale.setValue([100, -100]); // flip vertical
        refl.transform.position.setValue([450, 40]);
        var wipe = addEffect(refl, "ADBE Linear Wipe");
        setParam(wipe, "Transition Completion", 15); setParam(wipe, "Wipe Angle", 180); setParam(wipe, "Feather", 220);
        var ripple = addEffect(refl, "ADBE Wave Warp");
        setParam(ripple, "Wave Height", 6); setParam(ripple, "Wave Width", 120); setParam(ripple, "Direction", 90);
        var rblur = addEffect(refl, "ADBE Box Blur2"); setParam(rblur, "Blur Radius", 6);
        var rtint = addEffect(refl, "ADBE Tint"); setParam(rtint, "Map White To", hexToRGB(CFG.palette.Lavender));
        refl.transform.opacity.setValue(28);
        return c;
    }

    // --- Generic instanced decoration placer ---
    function placeInstances(comp, srcComp, count, opts) {
        for (var i = 0; i < count; i++) {
            var L = comp.layers.add(srcComp);
            L.name = opts.prefix + "_" + (i + 1);
            var x = rndRange(opts.xMin, opts.xMax);
            var y = rndRange(opts.yMin, opts.yMax);
            var sc = rndRange(opts.scaleMin, opts.scaleMax);
            L.transform.position.setValue([x, y]);
            L.transform.scale.setValue([sc, sc]);
            // baked seeded motion constants -> deterministic looping variety (loop-safe periods)
            var Tx = loopPeriod(opts.periodMin, opts.periodMax);
            var Ty = loopPeriod(opts.periodMin, opts.periodMax);
            var Af = rndRange(opts.ampMin, opts.ampMax);
            var ph = rndRange(0, Math.PI * 2);
            tryExpr(L.transform.position, EXPR.driftPos(Tx, Af, Ty, Af * 1.2, ph));
            if (opts.breathe) { tryExpr(L.transform.scale, EXPR.breathe(sc, sc * 0.03, loopPeriod(2.5, 6), ph)); }
            if (opts.spin) { tryExpr(L.transform.rotation, EXPR.wobble(rndRange(5, 12), loopPeriod(2.5, 8), ph)); }
            if (opts.twinkle) {
                var twRate = loopRate(4, 9);   // integer cycles over the loop -> seamless twinkle
                var twSeed = rnd();
                tryExpr(L.transform.scale, EXPR.twinkleScale(sc, twRate, twSeed));
                tryExpr(L.transform.opacity, EXPR.twinkleOpacityDensity(twRate, twSeed));
            } else if (opts.density) {
                tryExpr(L.transform.opacity, EXPR.densityOpacity("" + rndRange(opts.opMin || 80, opts.opMax || 100)));
            }
            if (opts.recolor) {
                var pick = opts.recolor[rndInt(0, opts.recolor.length - 1)];
                var fillFx = addEffect(L, "ADBE Fill");
                setParam(fillFx, "Color", hexToRGB(CFG.palette[pick]));
                exprParam(fillFx, "Color", EXPR.paletteColor("Color_" + pick));
            }
        }
    }

    // --- S07 Hearts / S08 Stars / S09 Sparkles / S10 Bokeh+Orbs / S11 Dust / S12 Trails ---
    function buildS07(folder, heartComp) {
        var c = getOrCreateComp("PRE_S07_Hearts", CFG.comp.width, CFG.comp.height, CFG.comp.durationSec, CFG.comp.fps, folder);
        placeInstances(c, heartComp, CFG.counts.heartsNear, { prefix: "Heart_Near", xMin: 120, xMax: 700, yMin: 380, yMax: 760, scaleMin: 120, scaleMax: 200, periodMin: 4, periodMax: 7, ampMin: 8, ampMax: 16, breathe: true, spin: true, density: false });
        placeInstances(c, heartComp, CFG.counts.heartsMid, { prefix: "Heart_Mid", xMin: 900, xMax: 1800, yMin: 300, yMax: 820, scaleMin: 70, scaleMax: 120, periodMin: 4, periodMax: 7, ampMin: 6, ampMax: 12, breathe: true, spin: true });
        placeInstances(c, heartComp, CFG.counts.heartsSmall, { prefix: "Heart_Small", xMin: 200, xMax: 1720, yMin: 120, yMax: 960, scaleMin: 30, scaleMax: 60, periodMin: 5, periodMax: 8, ampMin: 5, ampMax: 10, breathe: true, spin: true, density: true, opMin: 85, opMax: 100 });
        return c;
    }
    function buildS08(folder, starComp) {
        var c = getOrCreateComp("PRE_S08_Stars", CFG.comp.width, CFG.comp.height, CFG.comp.durationSec, CFG.comp.fps, folder);
        placeInstances(c, starComp, CFG.counts.stars, { prefix: "Star", xMin: 80, xMax: 1840, yMin: 120, yMax: 980, scaleMin: 30, scaleMax: 90, periodMin: 4, periodMax: 8, ampMin: 6, ampMax: 14, breathe: true, spin: true, density: true, recolor: ["Yellow", "Teal", "Pink_Hot", "Lavender", "Star_Cream"] });
        return c;
    }
    function buildS09(folder, sparkleComp) {
        var c = getOrCreateComp("PRE_S09_Sparkles", CFG.comp.width, CFG.comp.height, CFG.comp.durationSec, CFG.comp.fps, folder);
        placeInstances(c, sparkleComp, CFG.counts.sparkles, { prefix: "Sparkle", xMin: 40, xMax: 1880, yMin: 60, yMax: 1020, scaleMin: 20, scaleMax: 90, periodMin: 3, periodMax: 6, ampMin: 4, ampMax: 10, twinkle: true, recolor: ["White", "Pink_Light", "Lavender", "White", "White"] });
        return c;
    }
    function buildS10(folder, bokehComp, orbComp) {
        var c = getOrCreateComp("PRE_S10_Bokeh", CFG.comp.width, CFG.comp.height, CFG.comp.durationSec, CFG.comp.fps, folder);
        placeInstances(c, bokehComp, CFG.counts.bokehFar, { prefix: "BokehFar", xMin: 60, xMax: 1860, yMin: 80, yMax: 1000, scaleMin: 20, scaleMax: 70, periodMin: 8, periodMax: 10, ampMin: 6, ampMax: 14, density: true, opMin: 15, opMax: 35 });
        placeInstances(c, bokehComp, CFG.counts.bokehNear, { prefix: "BokehNear", xMin: 60, xMax: 1860, yMin: 500, yMax: 1040, scaleMin: 80, scaleMax: 170, periodMin: 8, periodMax: 10, ampMin: 10, ampMax: 22, density: true, opMin: 15, opMax: 30 });
        // solid orbs (teal + pink) — recolor via fill
        for (var i = 0; i < CFG.counts.orbs; i++) {
            var o = c.layers.add(orbComp);
            o.name = "Orb_" + (i + 1);
            o.transform.position.setValue([rndRange(120, 1800), rndRange(500, 980)]);
            var sc = rndRange(60, 110); o.transform.scale.setValue([sc, sc]);
            tryExpr(o.transform.position, EXPR.driftPos(loopPeriod(8, 10), 12, loopPeriod(5, 8), 14, rndRange(0, 6)));
            var fx = addEffect(o, "ADBE Fill");
            var pick = (i % 2 === 0) ? "Teal" : "Pink_Hot";
            setParam(fx, "Color", hexToRGB(CFG.palette[pick]));
            exprParam(fx, "Color", EXPR.paletteColor("Color_" + pick));
        }
        return c;
    }
    function buildS11(folder) {
        var c = getOrCreateComp("PRE_S11_Dust", CFG.comp.width, CFG.comp.height, CFG.comp.durationSec, CFG.comp.fps, folder);
        var emitter = addSolid(c, "SOL_Dust", [0, 0, 0], CFG.comp.width, CFG.comp.height);
        emitter.blendingMode = BlendingMode.ADD;
        var used = "none";
        if (PLUGINS.particular) {
            var p = addEffect(emitter, PLUGINS.particular); if (p) { used = "Trapcode Particular"; }
        } else if (PLUGINS.form) {
            var fm = addEffect(emitter, PLUGINS.form); if (fm) { used = "Trapcode Form"; }
        }
        if (used === "none") {
            var cc = addEffect(emitter, "CC Particle Systems II");
            if (cc) {
                setParam(cc, "Birth Rate", 1.2);
                setParam(cc, "Longevity (sec)", 6);
                used = "CC Particle Systems II (built-in fallback)";
            } else {
                // last-resort: instanced dust points
                for (var i = 0; i < 40; i++) {
                    var dpt = newShapeLayer(c, "Dust_" + (i + 1));
                    var g = addGroupContents(rootContents(dpt), "d");
                    addEllipse(g, rndRange(2, 5), rndRange(2, 5), 0, 0);
                    addFill(g, hexToRGB(CFG.palette.White));
                    dpt.transform.position.setValue([rndRange(0, CFG.comp.width), rndRange(0, CFG.comp.height)]);
                    dpt.blendingMode = BlendingMode.ADD;
                    tryExpr(dpt.transform.position, EXPR.driftPos(10, 20, loopPeriod(5, 8), 16, rndRange(0, 6)));
                    tryExpr(dpt.transform.opacity, EXPR.twinkleOpacity(loopRate(2, 5), rnd()));
                }
                used = "instanced shape dust (final fallback)";
            }
        }
        var glow = addEffect(emitter, "ADBE Glo2"); setParam(glow, "Glow Radius", 12);
        PLUGINS.report.push("Fairy Dust (S11): " + used);
        log("S11 dust: " + used);
        return c;
    }
    function buildS12(folder) {
        var c = getOrCreateComp("PRE_S12_Trails", CFG.comp.width, CFG.comp.height, CFG.comp.durationSec, CFG.comp.fps, folder);
        for (var i = 0; i < 4; i++) {
            var tl = newShapeLayer(c, "Trail_" + (i + 1));
            var root = rootContents(tl);
            var g = addGroupContents(root, "Curve");
            var pg = g.addProperty("ADBE Vector Shape - Group");
            var verts = [[0, 0], [90, -60], [200, -30], [300, -110]];
            var sh = new Shape(); sh.vertices = verts;
            sh.inTangents = [[0, 0], [-40, 0], [-40, 20], [-40, 30]];
            sh.outTangents = [[40, 0], [40, -20], [40, -20], [0, 0]]; sh.closed = false;
            trySet(pg.property("ADBE Vector Shape"), sh);
            var st = addStroke(g, hexToRGB(CFG.palette.Pink_Light), 5, 80);
            // dashed
            try {
                var dashes = st.property("ADBE Vector Stroke Dashes");
                var d = dashes.addProperty("ADBE Vector Stroke Dash 1"); setParam(d, "", 8);
                var gap = dashes.addProperty("ADBE Vector Stroke Gap 1"); setParam(gap, "", 12);
                var off = dashes.addProperty("ADBE Vector Stroke Offset 1");
                tryExpr(off, EXPR.dashScroll(30));
            } catch (e) {}
            tl.transform.position.setValue([rndRange(150, 1600), rndRange(300, 900)]);
            tl.transform.rotation.setValue(rndRange(-30, 30));
            tl.blendingMode = BlendingMode.ADD;
            tryExpr(tl.transform.opacity, EXPR.densityOpacity("70"));
        }
        return c;
    }

    // =================================================================================
    //  10. MASTER ASSEMBLY — planes, camera rig, lights, placement, grade+bloom  [Bible §9, §12.1]
    // =================================================================================
    function buildPlanes(master) {
        var map = {};
        for (var i = 0; i < CFG.planes.length; i++) {
            var pdef = CFG.planes[i];
            var n = addNull(master, pdef.name);
            n.threeDLayer = true;
            n.transform.position.setValue([CFG.comp.width / 2, CFG.comp.height / 2, pdef.z]);
            tryExpr(n.transform.position, EXPR.planeZ(pdef.z));
            n.shy = true;
            map[pdef.name] = n;
        }
        return map;
    }
    function buildCameraRig(master) {
        var orient = addNull(master, "NULL_Cam_Orient");
        orient.threeDLayer = true;
        orient.transform.position.setValue([CFG.comp.width / 2, CFG.comp.height / 2, 0]);
        var cam = master.layers.addCamera("CAM_Main", [CFG.comp.width / 2, CFG.comp.height / 2]);
        try { cam.parent = orient; } catch (e) {}
        // one-node camera base position (pull back along -Z)
        var baseZ = -CFG.camera.zoomPx;
        cam.transform.position.setValue([CFG.comp.width / 2, CFG.comp.height / 2, baseZ]);
        tryExpr(cam.transform.position, EXPR.cameraDrift(CFG.comp.width / 2, CFG.comp.height / 2, baseZ));
        // camera options: DOF on, zoom, focus lock, blur level gated by Preview Mode
        try {
            var opt = cam.property("ADBE Camera Options Group");
            trySet(opt.property("ADBE Camera Zoom"), CFG.camera.zoomPx);
            trySet(opt.property("ADBE Camera Depth of Field"), 1);
            tryExpr(opt.property("ADBE Camera Focus Distance"), EXPR.focusLock);
            tryExpr(opt.property("ADBE Camera Blur Level"), EXPR.blurLevel);
        } catch (e) { warn("camera options: " + e.toString()); }
        return { cam: cam, orient: orient };
    }
    function buildLights(master) {
        // Lighting architecture: ambient fill + key + rim + star practical. Affect 3D layers only. [Bible §6]
        var lights = [];
        try {
            var amb = master.layers.addLight("LGT_Ambient_Fill", [CFG.comp.width / 2, CFG.comp.height / 2]);
            amb.lightType = LightType.AMBIENT;
            trySet(amb.property("ADBE Light Options Group").property("ADBE Light Color"), hexToRGB(CFG.palette.BG_Glow));
            trySet(amb.property("ADBE Light Options Group").property("ADBE Light Intensity"), 40);
            lights.push(amb);
        } catch (e) { warn("ambient light: " + e.toString()); }
        try {
            var key = master.layers.addLight("LGT_Key", [520, 320]);
            key.lightType = LightType.SPOT;
            key.threeDLayer = true;
            key.transform.position.setValue([420, 260, -900]);
            trySet(key.property("ADBE Light Options Group").property("ADBE Light Color"), hexToRGB(CFG.palette.Pink_Light));
            trySet(key.property("ADBE Light Options Group").property("ADBE Light Intensity"), 90);
            lights.push(key);
        } catch (e) { warn("key light: " + e.toString()); }
        try {
            var rim = master.layers.addLight("LGT_Rim", [CFG.comp.width / 2, CFG.comp.height / 2]);
            rim.lightType = LightType.POINT;
            rim.transform.position.setValue([CFG.comp.width / 2, 400, 600]);
            trySet(rim.property("ADBE Light Options Group").property("ADBE Light Color"), hexToRGB(CFG.palette.Lavender));
            trySet(rim.property("ADBE Light Options Group").property("ADBE Light Intensity"), 60);
            lights.push(rim);
        } catch (e) { warn("rim light: " + e.toString()); }
        return lights;
    }
    function factorOf(planeName) {
        for (var i = 0; i < CFG.planes.length; i++) { if (CFG.planes[i].name === planeName) { return CFG.planes[i].factor; } }
        return 1.0;
    }
    function placeSystem(master, sysComp, factor, opts) {
        var L = master.layers.add(sysComp);
        if (opts && opts.name) { L.name = opts.name; }
        if (opts && opts.blend) { L.blendingMode = opts.blend; }
        // Full-frame 2D card, centered; parallax handled by expression reading the camera drift
        // (see EXPR.parallax rationale). Keeps full-frame coverage + authored layouts intact.
        try { L.transform.position.setValue([master.width / 2, master.height / 2]); } catch (e) {}
        tryExpr(L.transform.position, EXPR.parallax(factor, master.width / 2, master.height / 2));
        return L;
    }
    function buildGradeAndBloom(master) {
        var bloom = addAdjustment(master, "ADJ_Bloom");
        applyBloom(bloom, null, "Global");
        // global bloom intensity linked to Master Glow
        var grade = addAdjustment(master, "ADJ_Grade");
        var lum = addEffect(grade, "ADBE Lumetri");
        if (!lum) {
            // fallback grade chain
            addEffect(grade, "ADBE CurvesCustom");
            var hs = addEffect(grade, "ADBE HUE SATURATION"); setParam(hs, "Master Saturation", 10);
            var pf = addEffect(grade, "ADBE PhotoFilterPS");
        }
        // anti-band grain
        var noise = addEffect(grade, "ADBE Noise"); setParam(noise, "Amount of Noise", 2.0);
        // vignette (dark feathered ellipse mask on its own layer)
        var vig = addSolid(master, "SOL_Vignette", [0, 0, 0], master.width, master.height);
        vig.transform.opacity.setValue(35);
        try {
            var mask = vig.property("ADBE Mask Parade").addProperty("ADBE Mask Atom");
            var mShape = new Shape();
            var mw = master.width, mh = master.height;
            mShape.vertices = [[mw * 0.5, -mh * 0.15], [mw * 1.15, mh * 0.5], [mw * 0.5, mh * 1.15], [-mw * 0.15, mh * 0.5]];
            mShape.closed = true;
            mask.property("ADBE Mask Shape").setValue(mShape);
            mask.property("ADBE Mask Feather").setValue([300, 300]);
            mask.maskMode = MaskMode.SUBTRACT;
        } catch (e) { warn("vignette mask: " + e.toString()); }
        return { bloom: bloom, grade: grade, vignette: vig };
    }

    // =================================================================================
    //  11. RENDER QUEUE  [Bible §18.3]
    // =================================================================================
    function setupRenderQueue(master) {
        try {
            var rqi = app.project.renderQueue.items.add(master);
            try { rqi.applyTemplate("Best Settings"); } catch (e) {}
            var om = rqi.outputModule(1);
            var outDir = new Folder((app.project.file ? app.project.file.parent.fsName : Folder.desktop.fsName) + "/render");
            if (!outDir.exists) { outDir.create(); }
            // Prefer a lossless/ProRes-ish template if available; otherwise leave default.
            var templates = om.templates;
            var chosen = null;
            for (var i = 0; i < templates.length; i++) {
                if (/ProRes 4444|Lossless|QuickTime/i.test(templates[i])) { chosen = templates[i]; break; }
            }
            if (chosen) { try { om.applyTemplate(chosen); } catch (e) {} }
            try { om.file = new File(outDir.fsName + "/Starlight_Reverie_master"); } catch (e) {}
            rqi.render = false; // queued but not auto-rendered
            log("Render Queue: master queued (render flag off).");
        } catch (e) { warn("render queue setup: " + e.toString()); }
    }

    // =================================================================================
    //  12. RESTART-SAFETY / CLEAN  [Bible §18.2 idempotency]
    // =================================================================================
    var MANAGED_NAMES = null;
    function collectManagedNames() {
        var names = ["MASTER_" + CFG.project.name + "_1080p",
                     "PRE_Daisy", "PRE_Heart", "PRE_StarSmall", "PRE_Sparkle", "PRE_Bokeh", "PRE_Orb",
                     "__SR_PLUGIN_PROBE__"];
        var sys = ["PRE_S01_BG_Cosmos", "PRE_S02_Nebula", "PRE_S03_WishStar", "PRE_S04_Ribbon",
                   "PRE_S05_Character", "PRE_S06_Reflection", "PRE_S07_Hearts", "PRE_S08_Stars",
                   "PRE_S09_Sparkles", "PRE_S10_Bokeh", "PRE_S11_Dust", "PRE_S12_Trails"];
        for (var i = 0; i < sys.length; i++) { names.push(sys[i]); }
        var folders = ["00_MASTERS", "10_SYSTEMS", "20_SOURCES", "30_ASSETS", "31_Character",
                       "32_Textures", "40_CONTROLLERS", "50_CAMERA", "90_RENDER", "99_PRECOMP_TRASH"];
        for (var j = 0; j < folders.length; j++) { names.push(folders[j]); }
        return names;
    }
    function cleanPreviousBuild() {
        if (!CFG.project.rebuildClean) { return; }
        var names = collectManagedNames();
        var removed = 0;
        // remove comps/footage first, then folders
        for (var pass = 0; pass < 2; pass++) {
            for (var i = app.project.items.length; i >= 1; i--) {
                var it = app.project.items[i];
                var match = false;
                for (var k = 0; k < names.length; k++) { if (it.name === names[k]) { match = true; break; } }
                if (!match) { continue; }
                var isFolder = (it instanceof FolderItem);
                if (pass === 0 && !isFolder) {
                    try { it.remove(); removed++; } catch (e) {}
                } else if (pass === 1 && isFolder && it.numItems === 0) {
                    // only remove a managed folder once empty -> never destroys unmanaged user content
                    try { it.remove(); removed++; } catch (e) {}
                }
            }
        }
        if (removed > 0) { log("Restart-safe clean: removed " + removed + " prior managed item(s)."); }
    }

    // =================================================================================
    //  13. VALIDATION  [Bible §22]
    // =================================================================================
    function validate(refs) {
        var V = { pass: 0, fail: 0, notes: [] };
        function check(cond, label) { if (cond) { V.pass++; } else { V.fail++; V.notes.push("FAIL: " + label); } }
        check(app.project.bitsPerChannel === 32, "project is 32 bpc");
        check(!!findItemByName("MASTER_" + CFG.project.name + "_1080p", CompItem), "master comp exists");
        check(!!refs.ctrl.global, "CTRL_Global exists");
        check(!!refs.ctrl.camera, "CTRL_Camera exists");
        var sysNames = ["PRE_S01_BG_Cosmos", "PRE_S02_Nebula", "PRE_S03_WishStar", "PRE_S04_Ribbon",
                        "PRE_S05_Character", "PRE_S06_Reflection", "PRE_S07_Hearts", "PRE_S08_Stars",
                        "PRE_S09_Sparkles", "PRE_S10_Bokeh", "PRE_S11_Dust", "PRE_S12_Trails"];
        for (var i = 0; i < sysNames.length; i++) { check(!!findItemByName(sysNames[i], CompItem), sysNames[i] + " built"); }
        var atoms = ["PRE_Daisy", "PRE_Heart", "PRE_StarSmall", "PRE_Sparkle", "PRE_Bokeh", "PRE_Orb"];
        for (var a = 0; a < atoms.length; a++) { check(!!findItemByName(atoms[a], CompItem), atoms[a] + " built"); }
        check(refs.master.layers.length >= 20, "master has full layer stack (" + refs.master.layers.length + ")");
        check(!findItemByName("__SR_PLUGIN_PROBE__"), "probe comp removed");
        check(refs.master.duration === CFG.comp.durationSec, "10s loop duration");
        check(refs.master.frameRate === CFG.comp.fps, "30 fps");
        V.notes.push("Checks passed: " + V.pass + " / " + (V.pass + V.fail));
        return V;
    }

    // =================================================================================
    //  14. MAIN
    // =================================================================================
    function main() {
        if (!(app.project)) { app.newProject(); }
        app.beginUndoGroup("Build: Starlight Reverie");
        var t0 = new Date().getTime();
        try {
            log("=== Starlight Reverie generator start ===");

            // project settings
            try { app.project.bitsPerChannel = CFG.project.bitsPerChannel; } catch (e) { warn("bpc: " + e.toString()); }
            try { app.project.linearizeWorkingSpace = CFG.project.linearize; } catch (e) { warn("linearize: " + e.toString()); }
            try { app.project.expressionEngine = CFG.project.expressionEngine; } catch (e) { warn("expr engine: " + e.toString()); }

            cleanPreviousBuild();
            detectPlugins();

            // folders
            var fMasters = getOrCreateFolder("00_MASTERS");
            var fSystems = getOrCreateFolder("10_SYSTEMS");
            var fSources = getOrCreateFolder("20_SOURCES");
            var fAssets  = getOrCreateFolder("30_ASSETS");
            var fChar    = getOrCreateFolder("31_Character", fAssets);
            getOrCreateFolder("32_Textures", fAssets);
            getOrCreateFolder("40_CONTROLLERS");
            getOrCreateFolder("50_CAMERA");
            getOrCreateFolder("90_RENDER");
            getOrCreateFolder("99_PRECOMP_TRASH");
            log("Folder tree created.");

            // master comp
            var master = getOrCreateComp("MASTER_" + CFG.project.name + "_1080p",
                CFG.comp.width, CFG.comp.height, CFG.comp.durationSec, CFG.comp.fps, fMasters);

            // controllers first (everything reads them)
            var ctrl = buildControllers(master);
            log("Controllers built.");

            // source atoms
            var daisy = buildAtom_Daisy(fSources);
            var heart = buildAtom_Heart(fSources);
            var starS = buildAtom_StarSmall(fSources);
            var spark = buildAtom_Sparkle(fSources);
            var bokeh = buildAtom_Bokeh(fSources);
            var orb   = buildAtom_Orb(fSources);
            log("Source atoms built.");

            // systems far->near
            var s01 = buildS01(fSystems);
            var s02 = buildS02(fSystems);
            var s03 = buildS03(fSystems);
            var s04 = buildS04(fSystems, daisy);
            var s05 = buildS05(fSystems, fChar);
            var s06 = buildS06(fSystems, s05);
            var s07 = buildS07(fSystems, heart);
            var s08 = buildS08(fSystems, starS);
            var s09 = buildS09(fSystems, spark);
            var s10 = buildS10(fSystems, bokeh, orb);
            var s11 = buildS11(fSystems);
            var s12 = buildS12(fSystems);
            log("Visual systems S01..S12 built.");

            // planes + camera + lights
            var planes = buildPlanes(master);
            var camrig = buildCameraRig(master);
            var lights = buildLights(master);
            log("Parallax planes, camera rig, and lights built.");

            // place systems on planes (far -> near); adjustment layers added last so they sit on top
            placeSystem(master, s01, factorOf("NULL_Plane_Far"),     { name: "S01_BG_Cosmos" });
            placeSystem(master, s02, factorOf("NULL_Plane_Far"),     { name: "S02_Nebula", blend: BlendingMode.ADD });
            placeSystem(master, s10, factorOf("NULL_Plane_Far"),     { name: "S10_Bokeh_Far" });
            placeSystem(master, s11, factorOf("NULL_Plane_Far"),     { name: "S11_Dust_Far", blend: BlendingMode.ADD });
            placeSystem(master, s03, factorOf("NULL_Plane_MidFar"),  { name: "S03_WishStar" });
            placeSystem(master, s04, factorOf("NULL_Plane_Mid"),     { name: "S04_Ribbon" });
            placeSystem(master, s08, factorOf("NULL_Plane_Mid"),     { name: "S08_Stars_Mid" });
            placeSystem(master, s07, factorOf("NULL_Plane_Mid"),     { name: "S07_Hearts_Mid" });
            placeSystem(master, s06, factorOf("NULL_Plane_Hero"),    { name: "S06_Reflection" });
            placeSystem(master, s05, factorOf("NULL_Plane_Hero"),    { name: "S05_Character" });
            placeSystem(master, s08, factorOf("NULL_Plane_NearMid"), { name: "S08_Stars_Near" });
            placeSystem(master, s07, factorOf("NULL_Plane_Near"),    { name: "S07_Hearts_Near" });
            placeSystem(master, s11, factorOf("NULL_Plane_Near"),    { name: "S11_Dust_Near", blend: BlendingMode.ADD });
            placeSystem(master, s12, factorOf("NULL_Plane_Near"),    { name: "S12_Trails", blend: BlendingMode.ADD });
            placeSystem(master, s09, factorOf("NULL_Plane_Near"),    { name: "S09_Sparkles", blend: BlendingMode.ADD });
            log("Systems placed on parallax planes.");

            // focus target -> hero plane
            try { setParam(ctrl.camera.effect("Focus Target"), "ADBE Layer Control-0001", indexOfLayer(master, "NULL_Plane_Hero")); } catch (e) {}

            // grade + bloom on top
            var post = buildGradeAndBloom(master);
            log("Grade + bloom passes built.");

            // background backstop at very bottom
            var backstop = addSolid(master, "SOL_Guide_BG", hexToRGB(CFG.palette.BG_Deep), master.width, master.height);
            try { backstop.moveToEnd(); backstop.locked = true; } catch (e) {}

            // adjustment layers to top; move bloom first, then grade, so ADJ_Grade is topmost [Bible §12.1]
            try { post.vignette.moveToBeginning(); post.bloom.moveToBeginning(); post.grade.moveToBeginning(); } catch (e) {}

            // markers on master (build + loop points)  [Bible §8.4]
            try {
                master.markerProperty.setValueAtTime(0, newMarker("LOOP START"));
                master.markerProperty.setValueAtTime(CFG.comp.durationSec - (1 / CFG.comp.fps), newMarker("LOOP END (==frame 0)"));
            } catch (e) {}

            // render queue
            setupRenderQueue(master);

            // open master
            try { master.openInViewer(); } catch (e) {}

            // validate
            var refs = { master: master, ctrl: ctrl, planes: planes, camrig: camrig };
            var V = validate(refs);

            var dt = ((new Date().getTime() - t0) / 1000).toFixed(1);
            log("=== Build complete in " + dt + "s | validation " + V.pass + "/" + (V.pass + V.fail) + " | warns " + LOG.warns + " ===");
            writeLogFile();
            summarizeDialog(V, dt);
        } catch (fatal) {
            err("FATAL: " + fatal.toString() + (fatal.line ? (" (line " + fatal.line + ")") : ""));
            writeLogFile();
            try { alert("Starlight Reverie build FAILED:\n" + fatal.toString() + "\n\nSee log:\n" + logPath()); } catch (e) {}
        } finally {
            app.endUndoGroup();
        }
    }

    function newMarker(comment) { var m = new MarkerValue(comment); return m; }
    function indexOfLayer(comp, name) { var L = comp.layers.byName(name); return L ? L.index : 0; }
    function logPath() { return Folder.temp.fsName + "/Starlight_Reverie_build_log.txt"; }
    function writeLogFile() {
        try {
            var f = new File(logPath());
            f.open("w");
            f.write("STARLIGHT REVERIE — build log\n" + (new Date()).toString() + "\n\n");
            f.write("PLUGIN REPORT:\n");
            for (var i = 0; i < PLUGINS.report.length; i++) { f.write("  " + PLUGINS.report[i] + "\n"); }
            f.write("\nLOG:\n" + LOG.lines.join("\n") + "\n");
            f.write("\nWarnings: " + LOG.warns + "  Errors: " + LOG.errors + "\n");
            f.close();
        } catch (e) {}
    }
    function summarizeDialog(V, dt) {
        var msg = "STARLIGHT REVERIE — build complete (" + dt + "s)\n\n";
        msg += "Validation: " + V.pass + " / " + (V.pass + V.fail) + " checks passed\n";
        msg += "Warnings: " + LOG.warns + "   Errors: " + LOG.errors + "\n\n";
        msg += "Plugins:\n";
        for (var i = 0; i < PLUGINS.report.length; i++) { msg += "  - " + PLUGINS.report[i] + "\n"; }
        if (V.notes.length) { msg += "\nNotes:\n  " + V.notes.join("\n  ") + "\n"; }
        msg += "\nLog: " + logPath();
        try { alert(msg); } catch (e) {}
    }

    // run
    main();

})();
