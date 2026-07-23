/**********************************************************************************************
 *  PELMESHE4EK RIG BUILDER
 *  ---------------------------------------------------------------------------------------------
 *  A dockable Adobe After Effects (ExtendScript / JSX) tool that auto-generates a complex,
 *  non-linear 3D "Game Menu Screen" rig for the TikTok creator @pelme_she4ek.
 *
 *  Concept:  "Surreal Kitchen / Dumpling Multiverse — The Dumpling Hub"
 *            A deep, parallaxed 3D main-menu scene with organic floating motion (wiggle driven
 *            by global controllers) and cinematic Depth of Field (bokeh).
 *
 *  Requirements met:
 *    - 1080x1920 @ 60fps, 15s master comp "Game_Menu_Master".
 *    - Dockable ScriptUI panel with title + build button.
 *    - 3D Camera (Zoom 2000, DoF ON, Aperture 150, Blur Level 100%) parented to CAMERA_CONTROLLER.
 *    - EXPRESSION_CONTROLS null with "Float Speed" (0.5) & "Float Amount" (30) sliders.
 *    - Full Z-space layout (BG solid, BG_Decor, character placeholder, 3 UI buttons, particles).
 *    - Global wiggle expressions linked to the control null (Z-depth preserved for clean parallax).
 *    - "Global Glow & Color" adjustment layer with built-in Glow (threshold 60%, radius 100).
 *    - Graceful duplicate-name handling and a friendly completion alert.
 *
 *  Uses ONLY built-in After Effects effects. No third-party plugins required.
 *  Install: drop this file into your "ScriptUI Panels" folder, then launch from the Window menu
 *  to get a dockable panel (or run via File > Scripts > Run Script File for a floating window).
 **********************************************************************************************/

(function pelmeshe4ekRigBuilder(thisObj) {

    // ============================================================================================
    //  CONFIG — tweak these to re-tune the whole rig from one place.
    // ============================================================================================
    var CONFIG = {
        compName:   "Game_Menu_Master",
        width:      1080,   // Vertical TikTok format
        height:     1920,
        pixelAspect: 1,
        fps:        60,
        duration:   15,     // seconds

        // Camera
        camZoom:        2000,
        camAperture:    150,
        camBlurLevel:   100,   // percent
        camDistance:    2000,  // camera pushed to -Z; also used as focus distance (focus on Z=0)

        // Global float controllers (defaults)
        floatSpeed:  0.5,
        floatAmount: 30,

        // Z-space depth map (world Z of each plane)
        zBackground:   5000,   // deep, blurred background
        zBGDecor:      2000,   // mid-ground environment / decor
        zCharacter:       0,   // focal plane — perfect sharpness
        zUI:           -500,   // interactive menu buttons (slight foreground blur)
        zParticles:   -1200,   // foreground floating flour dust (heavy bokeh)

        // Post
        glowThreshold: 60,     // percent
        glowRadius:    100,

        // Label colour for the character placeholder (1..16). 11 = Orange — warm & distinct.
        characterLabel: 11
    };

    // ============================================================================================
    //  SMALL HELPERS
    // ============================================================================================

    /**
     * Returns a comp name that is guaranteed not to collide with an existing comp.
     * If "Name" is taken, returns "Name_2", "Name_3", ... (graceful duplicate handling).
     */
    function getUniqueCompName(baseName) {
        var exists = function (n) {
            for (var i = 1; i <= app.project.numItems; i++) {
                var it = app.project.item(i);
                if (it instanceof CompItem && it.name === n) { return true; }
            }
            return false;
        };
        if (!exists(baseName)) { return baseName; }
        var counter = 2;
        while (exists(baseName + "_" + counter)) { counter++; }
        return baseName + "_" + counter;
    }

    /** Creates a new (empty) pre-comp CompItem in the project and returns it. */
    function createPrecomp(name) {
        return app.project.items.addComp(
            getUniqueCompName(name),
            CONFIG.width, CONFIG.height, CONFIG.pixelAspect, CONFIG.duration, CONFIG.fps
        );
    }

    /** Adds a Slider Control to a layer's effects, renames it, sets its value, returns the effect. */
    function addSlider(layer, sliderName, value) {
        var fx = layer.property("ADBE Effect Parade").addProperty("ADBE Slider Control");
        fx.name = sliderName;
        // The single Slider sub-property is index 1 (robust across UI languages).
        fx.property(1).setValue(value);
        return fx;
    }

    /**
     * Builds the wiggle expression string that drives organic float.
     * Reads BOTH global sliders from EXPRESSION_CONTROLS and preserves the layer's own Z value
     * so parallax depth and Depth-of-Field focus stay perfectly intact.
     */
    function buildFloatExpression() {
        return [
            "// --- Pelmeshe4ek global float rig ---",
            "var ctrl = thisComp.layer(\"EXPRESSION_CONTROLS\");",
            "var spd  = ctrl.effect(\"Float Speed\")(\"Slider\");",
            "var amt  = ctrl.effect(\"Float Amount\")(\"Slider\");",
            "var w = wiggle(spd, amt);",
            "// keep original Z so depth layout / DoF is not disturbed",
            "[w[0], w[1], value[2]];"
        ].join("\r");
    }

    /** Applies the float expression to a 3D layer's Position. */
    function applyFloat(layer) {
        layer.property("ADBE Transform Group").property("ADBE Position").expression = buildFloatExpression();
    }

    /** Convenience: force a layer 3D and set its 3D position. */
    function place3D(layer, x, y, z) {
        layer.threeDLayer = true;
        layer.property("ADBE Transform Group").property("ADBE Position").setValue([x, y, z]);
    }

    // ============================================================================================
    //  MAIN BUILD ROUTINE
    // ============================================================================================
    function buildGameMenuScene() {

        // Guard: make sure we have a project to build into.
        if (!app.project) { app.newProject(); }

        app.beginUndoGroup("Create Game Menu");
        try {
            var cx = CONFIG.width / 2;
            var cy = CONFIG.height / 2;

            // ------------------------------------------------------------------------------------
            //  1. MASTER COMPOSITION
            // ------------------------------------------------------------------------------------
            var comp = app.project.items.addComp(
                getUniqueCompName(CONFIG.compName),
                CONFIG.width, CONFIG.height, CONFIG.pixelAspect, CONFIG.duration, CONFIG.fps
            );
            comp.openInViewer();

            // ------------------------------------------------------------------------------------
            //  2. EXPRESSION CONTROLS (global float driver) — created first so expressions resolve.
            // ------------------------------------------------------------------------------------
            var ctrlNull = comp.layers.addNull();
            ctrlNull.name = "EXPRESSION_CONTROLS";
            ctrlNull.label = 5; // Lavender — reads as a "control" layer
            addSlider(ctrlNull, "Float Speed",  CONFIG.floatSpeed);
            addSlider(ctrlNull, "Float Amount", CONFIG.floatAmount);

            // ------------------------------------------------------------------------------------
            //  3. CAMERA RIG — a 3D camera parented to a controller null.
            // ------------------------------------------------------------------------------------
            var camNull = comp.layers.addNull();
            camNull.name = "CAMERA_CONTROLLER";
            camNull.threeDLayer = true;
            camNull.label = 8; // Blue
            // addNull places the null's position at comp centre; forcing 3D gives [cx, cy, 0].
            camNull.property("ADBE Transform Group").property("ADBE Position").setValue([cx, cy, 0]);

            var cam = comp.layers.addCamera("Main_Camera", [cx, cy]);
            var camOpts = cam.property("ADBE Camera Options Group");
            camOpts.property("ADBE Camera Zoom").setValue(CONFIG.camZoom);
            camOpts.property("ADBE Camera Depth of Field").setValue(1);        // ON
            camOpts.property("ADBE Camera Focus Distance").setValue(CONFIG.camDistance); // focus on Z=0 plane
            camOpts.property("ADBE Camera Aperture").setValue(CONFIG.camAperture);
            camOpts.property("ADBE Camera Blur Level").setValue(CONFIG.camBlurLevel);

            // Parent camera to the controller, THEN set local transform (values are now null-relative).
            cam.parent = camNull;
            cam.property("ADBE Transform Group").property("ADBE Position").setValue([0, 0, -CONFIG.camDistance]);
            cam.property("ADBE Transform Group").property("ADBE Pt of Interest").setValue([0, 0, 0]);

            // ------------------------------------------------------------------------------------
            //  4. Z-SPACE LAYERS (all 3D)
            // ------------------------------------------------------------------------------------

            // 4a. Deep background — dark warm grey solid, pushed far back and scaled to fully cover.
            var bg = comp.layers.addSolid([0.12, 0.10, 0.09], "BG_Deep_Space",
                                          CONFIG.width, CONFIG.height, CONFIG.pixelAspect);
            place3D(bg, cx, cy, CONFIG.zBackground);
            bg.property("ADBE Transform Group").property("ADBE Scale").setValue([500, 500, 500]);

            // 4b. Environment / decor pre-comp (mid-ground).
            var bgDecorItem = createPrecomp("BG_Decor");
            var bgDecor = comp.layers.add(bgDecorItem);
            place3D(bgDecor, cx, cy, CONFIG.zBGDecor);

            // 4c. Character placeholder pre-comp (focal plane) with distinct label colour + float.
            var charItem = createPrecomp("INSERT_CHARACTER_HERE");
            var charLayer = comp.layers.add(charItem);
            place3D(charLayer, cx, cy, CONFIG.zCharacter);
            charLayer.label = CONFIG.characterLabel;
            applyFloat(charLayer); // gentle idle bob linked to global controls

            // 4d. UI buttons — three rectangular solids acting as placeholders, all floating.
            var uiButtons = [
                { name: "Play Button",    color: [0.95, 0.55, 0.15], y: CONFIG.height * 0.55 },
                { name: "Outfits Button", color: [0.20, 0.75, 0.85], y: CONFIG.height * 0.68 },
                { name: "Settings",       color: [0.75, 0.35, 0.85], y: CONFIG.height * 0.81 }
            ];
            for (var b = 0; b < uiButtons.length; b++) {
                var def = uiButtons[b];
                var btn = comp.layers.addSolid(def.color, def.name, 720, 200, CONFIG.pixelAspect);
                place3D(btn, cx, def.y, CONFIG.zUI);
                btn.label = 6; // Peach
                applyFloat(btn);
            }

            // 4e. Foreground particle placeholder pre-comp (floating flour dust — heavy bokeh).
            var particlesItem = createPrecomp("FG_Particles");
            var particles = comp.layers.add(particlesItem);
            place3D(particles, cx, cy, CONFIG.zParticles);

            // ------------------------------------------------------------------------------------
            //  5. POST — adjustment layer at the very top with built-in Glow.
            // ------------------------------------------------------------------------------------
            var adj = comp.layers.addSolid([1, 1, 1], "Global Glow & Color",
                                           CONFIG.width, CONFIG.height, CONFIG.pixelAspect);
            adj.adjustmentLayer = true;
            adj.moveToBeginning();            // ensure it is the topmost layer
            adj.label = 9;                    // Green
            var glow = adj.property("ADBE Effect Parade").addProperty("ADBE Glo2"); // built-in Glow
            glow.property("Glow Threshold").setValue(CONFIG.glowThreshold);
            glow.property("Glow Radius").setValue(CONFIG.glowRadius);

            // ------------------------------------------------------------------------------------
            //  6. DONE
            // ------------------------------------------------------------------------------------
            alert("Scene generated! Open 'INSERT_CHARACTER_HERE' to add your animation, " +
                  "and swap the UI placeholders with your graphics.");

        } catch (err) {
            alert("Rig build failed:\n" + err.toString() +
                  (err.line ? ("\n(line " + err.line + ")") : ""));
        } finally {
            app.endUndoGroup();
        }
    }

    // ============================================================================================
    //  SCRIPTUI PANEL (dockable)
    // ============================================================================================
    function buildUI(rootObj) {
        var pal = (rootObj instanceof Panel)
            ? rootObj
            : new Window("palette", "Pelmeshe4ek Rig Builder", undefined, { resizeable: true });

        pal.orientation = "column";
        pal.alignChildren = ["fill", "top"];
        pal.spacing = 12;
        pal.margins = 16;

        // Static title.
        var title = pal.add("statictext", undefined, "Pelmeshe4ek Rig Builder");
        try {
            title.graphics.font = ScriptUI.newFont(title.graphics.font.name, "BOLD", 18);
        } catch (e) { /* older AE fallback: ignore font styling */ }

        var subtitle = pal.add("statictext", undefined, "Surreal Kitchen — Dumpling Multiverse");
        subtitle.alignment = ["fill", "top"];

        pal.add("panel").preferredSize = [ -1, 2 ]; // thin divider

        // Build button.
        var buildBtn = pal.add("button", undefined, "Build Game Menu Scene");
        buildBtn.onClick = function () {
            buildGameMenuScene();
        };

        pal.layout.layout(true);
        return pal;
    }

    // ============================================================================================
    //  BOOTSTRAP
    // ============================================================================================
    var ui = buildUI(thisObj);
    if (ui instanceof Window) {
        ui.center();
        ui.show();
    }

})(this);
