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
 *    - "Global Glow & Color" adjustment layer with a softly-tuned built-in Glow.
 *    - Placeholders ship with visible stand-in art (pedestal + label, decor blobs, dust dots,
 *      rounded UI plates with text) so the built scene reads immediately — swap them for your own.
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

        // Float controllers (defaults) — one pair per depth band so motion reads
        // naturally by distance. All live on EXPRESSION_CONTROLS and stay user-tunable.
        floatSpeed:  0.5,  // character + UI buttons (interactive foreground)
        floatAmount: 30,
        bgFloatSpeed:   0.2,  // BG_Decor — slow, wide, dreamy drift (far plane)
        bgFloatAmount:  45,
        dustFloatSpeed:  0.9, // FG_Particles — livelier, larger sway (near plane)
        dustFloatAmount: 70,

        // Z-space depth map (world Z of each plane)
        zBackground:   5000,   // deep, blurred background
        zBGDecor:      2000,   // mid-ground environment / decor
        zCharacter:       0,   // focal plane — perfect sharpness
        zUI:           -500,   // interactive menu buttons (slight foreground blur)
        zParticles:   -1200,   // foreground floating flour dust (heavy bokeh)

        // Post — Glow tuned so bright placeholders bloom softly instead of blowing out to white.
        glowThreshold: 75,     // percent (higher = only the brightest edges glow)
        glowRadius:    40,
        glowIntensity: 0.65,

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
     * Reads a named pair of sliders from EXPRESSION_CONTROLS (so each depth band can float on its
     * own settings) and preserves the layer's own Z value so parallax + Depth-of-Field stay intact.
     */
    function buildFloatExpression(speedName, amountName) {
        return [
            "// --- Pelmeshe4ek float rig ---",
            "var ctrl = thisComp.layer(\"EXPRESSION_CONTROLS\");",
            "var spd  = ctrl.effect(\"" + speedName + "\")(1);",
            "var amt  = ctrl.effect(\"" + amountName + "\")(1);",
            "var w = wiggle(spd, amt);",
            "// keep original Z so depth layout / DoF is not disturbed",
            "[w[0], w[1], value[2]];"
        ].join("\r");
    }

    /**
     * Applies the float expression to a 3D layer's Position.
     * Defaults to the "Float Speed"/"Float Amount" controls; pass other slider names to drive a
     * layer from a different depth band's controls.
     */
    function applyFloat(layer, speedName, amountName) {
        layer.property("ADBE Transform Group").property("ADBE Position").expression =
            buildFloatExpression(speedName || "Float Speed", amountName || "Float Amount");
    }

    /** Convenience: force a layer 3D and set its 3D position. */
    function place3D(layer, x, y, z) {
        layer.threeDLayer = true;
        layer.property("ADBE Transform Group").property("ADBE Position").setValue([x, y, z]);
    }

    /** Sets a shape Fill colour, tolerating both 3- and 4-channel colour properties across versions. */
    function setFillColor(fillColorProp, c) {
        try { fillColorProp.setValue([c[0], c[1], c[2], 1]); }
        catch (e) { try { fillColorProp.setValue([c[0], c[1], c[2]]); } catch (e2) {} }
    }

    /** Adds a filled ellipse shape layer to any comp at [x, y] (2D). Returns the layer. */
    function addEllipseShape(targetComp, name, w, h, color, x, y) {
        var lyr = targetComp.layers.addShape();
        lyr.name = name;
        var root = lyr.property("ADBE Root Vectors Group");
        var ell = root.addProperty("ADBE Vector Shape - Ellipse");
        ell.property("ADBE Vector Ellipse Size").setValue([w, h]);
        var fill = root.addProperty("ADBE Vector Graphic - Fill");
        setFillColor(fill.property("ADBE Vector Fill Color"), color);
        lyr.property("ADBE Transform Group").property("ADBE Position").setValue([x, y]);
        return lyr;
    }

    /** Styles a text layer's TextDocument (size, colour, centre justification). */
    function styleText(textLayer, size, color) {
        var tdProp = textLayer.property("ADBE Text Properties").property("ADBE Text Document");
        var doc = tdProp.value;
        doc.fontSize = size;
        doc.applyFill = true;
        doc.fillColor = color;
        doc.justification = ParagraphJustification.CENTER_JUSTIFY;
        tdProp.setValue(doc);
    }

    /**
     * Creates a rounded-rectangle UI button (shape layer) with a centred text label parented to it,
     * placed in 3D at [x, y, z] and driven by the global float rig.
     */
    function addRoundedButton(targetComp, name, labelText, color, x, y, z) {
        var lyr = targetComp.layers.addShape();
        lyr.name = name;
        var root = lyr.property("ADBE Root Vectors Group");
        var rect = root.addProperty("ADBE Vector Shape - Rect");
        rect.property("ADBE Vector Rect Size").setValue([720, 190]);
        rect.property("ADBE Vector Rect Roundness").setValue(45);
        var fill = root.addProperty("ADBE Vector Graphic - Fill");
        setFillColor(fill.property("ADBE Vector Fill Color"), color);
        lyr.threeDLayer = true;
        lyr.property("ADBE Transform Group").property("ADBE Position").setValue([x, y, z]);
        lyr.label = 6; // Peach
        applyFloat(lyr);

        var txt = targetComp.layers.addText(labelText);
        txt.name = name + " Label";
        txt.threeDLayer = true;
        styleText(txt, 76, [1, 1, 1]);
        txt.parent = lyr; // rides the button's wiggle
        // Local offset: centre vertically on the plate and nudge 1px toward camera to avoid z-fighting.
        txt.property("ADBE Transform Group").property("ADBE Position").setValue([0, 26, -1]);
        return lyr;
    }

    /** Fills the character pre-comp with a pedestal + a clear "drop your character here" label. */
    function fillCharacterPrecomp(item) {
        var w = CONFIG.width, h = CONFIG.height;
        addEllipseShape(item, "Pedestal", 540, 130, [0.85, 0.50, 0.18], w / 2, h * 0.64);
        var txt = item.layers.addText("INSERT\rCHARACTER\rHERE");
        txt.name = "Placeholder Label";
        styleText(txt, 88, [0.96, 0.78, 0.45]);
        txt.property("ADBE Transform Group").property("ADBE Position").setValue([w / 2, h * 0.42]);
    }

    /** Scatters a few soft cream "dumpling" blobs into the BG_Decor pre-comp. */
    function fillDecorPrecomp(item) {
        var w = CONFIG.width, h = CONFIG.height, cream = [0.90, 0.82, 0.63];
        addEllipseShape(item, "Decor_1", 260, 220, cream, w * 0.22, h * 0.30);
        addEllipseShape(item, "Decor_2", 300, 250, cream, w * 0.78, h * 0.24);
        addEllipseShape(item, "Decor_3", 220, 190, cream, w * 0.82, h * 0.62);
        addEllipseShape(item, "Decor_4", 240, 200, cream, w * 0.18, h * 0.66);
    }

    /** Scatters glowing gold "flour dust" dots into the FG_Particles pre-comp. */
    function fillParticlesPrecomp(item) {
        var w = CONFIG.width, h = CONFIG.height, gold = [1, 0.90, 0.68];
        var pts = [[0.10, 0.20, 90], [0.86, 0.35, 70], [0.24, 0.80, 120], [0.66, 0.86, 90],
                   [0.50, 0.28, 60], [0.78, 0.66, 110], [0.16, 0.52, 70], [0.42, 0.60, 50]];
        for (var i = 0; i < pts.length; i++) {
            addEllipseShape(item, "Dust_" + (i + 1), pts[i][2], pts[i][2], gold,
                            w * pts[i][0], h * pts[i][1]);
        }
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
            addSlider(ctrlNull, "Float Speed",      CONFIG.floatSpeed);   // character + UI
            addSlider(ctrlNull, "Float Amount",     CONFIG.floatAmount);
            addSlider(ctrlNull, "BG Float Speed",   CONFIG.bgFloatSpeed);  // BG_Decor
            addSlider(ctrlNull, "BG Float Amount",  CONFIG.bgFloatAmount);
            addSlider(ctrlNull, "Dust Float Speed", CONFIG.dustFloatSpeed); // FG_Particles
            addSlider(ctrlNull, "Dust Float Amount",CONFIG.dustFloatAmount);

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
            // NOTE: on camera/light layers the Point of Interest lives under the anchor-point
            // matchName ("ADBE Anchor Point") — NOT "ADBE Pt of Interest" (which does not exist).
            cam.property("ADBE Transform Group").property("ADBE Anchor Point").setValue([0, 0, 0]);

            // ------------------------------------------------------------------------------------
            //  4. Z-SPACE LAYERS (all 3D)
            // ------------------------------------------------------------------------------------

            // 4a. Deep background — dark warm grey solid, pushed far back and scaled to fully cover.
            var bg = comp.layers.addSolid([0.12, 0.10, 0.09], "BG_Deep_Space",
                                          CONFIG.width, CONFIG.height, CONFIG.pixelAspect);
            place3D(bg, cx, cy, CONFIG.zBackground);
            bg.property("ADBE Transform Group").property("ADBE Scale").setValue([500, 500, 500]);

            // 4b. Environment / decor pre-comp (mid-ground) — slow, wide drift.
            var bgDecorItem = createPrecomp("BG_Decor");
            fillDecorPrecomp(bgDecorItem); // visible placeholder dumpling blobs
            var bgDecor = comp.layers.add(bgDecorItem);
            place3D(bgDecor, cx, cy, CONFIG.zBGDecor);
            applyFloat(bgDecor, "BG Float Speed", "BG Float Amount");

            // 4c. Character placeholder pre-comp (focal plane) with distinct label colour + float.
            var charItem = createPrecomp("INSERT_CHARACTER_HERE");
            fillCharacterPrecomp(charItem); // pedestal + "insert your character" label
            var charLayer = comp.layers.add(charItem);
            place3D(charLayer, cx, cy, CONFIG.zCharacter);
            charLayer.label = CONFIG.characterLabel;
            applyFloat(charLayer); // gentle idle bob linked to global controls

            // 4d. UI buttons — rounded shape-layer plates with text labels, all floating.
            var uiButtons = [
                { name: "Play Button",    label: "PLAY",     color: [0.95, 0.45, 0.12], y: CONFIG.height * 0.56 },
                { name: "Outfits Button", label: "OUTFITS",  color: [0.16, 0.66, 0.80], y: CONFIG.height * 0.69 },
                { name: "Settings",       label: "SETTINGS", color: [0.62, 0.30, 0.82], y: CONFIG.height * 0.82 }
            ];
            for (var b = 0; b < uiButtons.length; b++) {
                var def = uiButtons[b];
                addRoundedButton(comp, def.name, def.label, def.color, cx, def.y, CONFIG.zUI);
            }

            // 4e. Foreground particle placeholder pre-comp (floating flour dust — heavy bokeh).
            //      Livelier sway on its own controls so the near plane feels alive.
            var particlesItem = createPrecomp("FG_Particles");
            fillParticlesPrecomp(particlesItem); // glowing gold dust dots
            var particles = comp.layers.add(particlesItem);
            place3D(particles, cx, cy, CONFIG.zParticles);
            applyFloat(particles, "Dust Float Speed", "Dust Float Amount");

            // ------------------------------------------------------------------------------------
            //  5. POST — adjustment layer at the very top with built-in Glow.
            // ------------------------------------------------------------------------------------
            var adj = comp.layers.addSolid([1, 1, 1], "Global Glow & Color",
                                           CONFIG.width, CONFIG.height, CONFIG.pixelAspect);
            adj.adjustmentLayer = true;
            adj.moveToBeginning();            // ensure it is the topmost layer
            adj.label = 9;                    // Green
            var glow = adj.property("ADBE Effect Parade").addProperty("ADBE Glo2"); // built-in Glow
            // Address by property index (language-independent): 2 = Threshold, 3 = Radius, 4 = Intensity.
            glow.property(2).setValue(CONFIG.glowThreshold);
            glow.property(3).setValue(CONFIG.glowRadius);
            try { glow.property(4).setValue(CONFIG.glowIntensity); } catch (e) { /* older Glow */ }

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
