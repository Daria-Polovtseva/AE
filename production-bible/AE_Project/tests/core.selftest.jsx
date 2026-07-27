// core.selftest.jsx — Stage-1 runtime assertions. Run in After Effects 2026 or ESTK.
// Loads the core modules and verifies the foundation before feature stages depend on it.
// (Uses #include so it runs standalone in-engine; not part of the dist build.)

#target aftereffects

#include "../src/core/00_namespace.jsxinc"
#include "../src/core/10_config.jsxinc"
#include "../src/core/20_logger.jsxinc"
#include "../src/core/30_random.jsxinc"
#include "../src/core/40_guards.jsxinc"
#include "../src/core/50_env.jsxinc"

(function () {
    var SR = $.global.SR;
    var pass = 0, fail = 0, notes = [];
    function ok(cond, label) { if (cond) { pass++; } else { fail++; notes.push("FAIL: " + label); } }

    // namespace + registry
    ok(!!SR, "SR namespace exists");
    ok(SR.VERSION === "2.0.0", "version is 2.0.0");
    ok(SR.modules.length >= 6, "at least 6 core modules registered (" + SR.modules.length + ")");
    ok(SR.has("Logger") && SR.has("Random") && SR.has("Guard") && SR.has("Env"), "core APIs attached");

    // config integrity
    ok(SR.config.comp.durationSec === 10 && SR.config.comp.fps === 30, "10s @ 30fps");
    ok(SR.config.planes.length === 7, "7 parallax planes");
    ok(SR.config.masterName === "MASTER_Starlight_Reverie_1080p", "master name derived");
    var palKeys = 0, k; for (k in SR.config.palette) { if (SR.config.palette.hasOwnProperty(k)) { palKeys++; } }
    ok(palKeys === 12, "12 palette colors (" + palKeys + ")");

    // RNG determinism
    SR.Random.reset(SR.config.seed); var a1 = SR.Random.next(); var a2 = SR.Random.next();
    SR.Random.reset(SR.config.seed); var b1 = SR.Random.next(); var b2 = SR.Random.next();
    ok(a1 === b1 && a2 === b2, "PRNG is deterministic for a fixed seed");
    ok(a1 >= 0 && a1 < 1, "PRNG output in [0,1)");

    // loop-safe math: durationSec / loopPeriod must be a whole number of cycles
    var okLoop = true;
    for (var i = 0; i < 200; i++) {
        var T = SR.Random.loopPeriod(3, 8);
        var cycles = SR.config.comp.durationSec / T;
        if (Math.abs(cycles - Math.round(cycles)) > 1e-9) { okLoop = false; break; }
    }
    ok(okLoop, "loopPeriod always yields an integer number of cycles over the loop");
    var okRate = Math.abs((SR.Random.loopRate(4, 9) * SR.config.comp.durationSec) % 1) < 1e-9;
    ok(okRate, "loopRate yields integer cycles over the loop");

    // logger
    SR.Logger.start(); SR.Logger.info("selftest"); SR.Logger.warn("w"); SR.Logger.error("e");
    ok(SR.Logger.warnCount === 1 && SR.Logger.errorCount === 1, "logger counts warns/errors");

    alert("CORE SELFTEST\n\nPassed: " + pass + " / " + (pass + fail) +
          (notes.length ? ("\n\n" + notes.join("\n")) : "\n\nAll core checks passed."));
})();
