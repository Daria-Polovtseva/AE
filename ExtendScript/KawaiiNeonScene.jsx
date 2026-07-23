/**********************************************************************************************
 *  KawaiiNeonScene.jsx
 *  Генератор кавайной неоново-розовой сцены с импортом видео и удалением хромакея.
 *  Целевая версия: Adobe After Effects 2026 (совместимо с движком выражений JavaScript).
 *
 *  Что делает скрипт:
 *    1. Просит выбрать видео с персонажем на зелёном фоне и импортирует его.
 *    2. Использует активную композицию или создаёт новую (1920x1080, 29.97 fps, 10 c).
 *    3. Кладёт видео в центр, снимает зелёный фон (Keylight / фолбэк Linear Color Key).
 *    4. Стилизует персонажа: Tint (нейтрализация зелёного рефлекса) + Glow + Drop Shadow.
 *    5. Создаёт зеркальный пол: дубликат, отражённый по Y, приглушённый, с Box Blur.
 *    6. Процедурно генерирует фон: солид, лента с цветами, глянцевые сердца, звёзды,
 *       неоновые плюсы и кружки — всё со свечением.
 *    7. Анимирует: фаза A (0:00–2:00) — плавное появление с Ease Out; фаза B — вечный луп.
 *
 *  Весь процесс обёрнут в один Undo-группу и защищён проверками.
 *********************************************************************************************/

(function KawaiiNeonScene() {

    // ---------------------------------------------------------------------------------------
    // 0. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (утилиты, устойчивые к разным сборкам AE)
    // ---------------------------------------------------------------------------------------

    /**
     * Устанавливает цвет свойству, пробуя сначала 4-компонентный (RGBA), затем 3 (RGB).
     * Разные типы color-свойств в AE ожидают разную размерность, поэтому пробуем оба.
     */
    function setColor(prop, r, g, b) {
        if (!prop) return;
        try { prop.setValue([r, g, b, 1]); }
        catch (e) {
            try { prop.setValue([r, g, b]); } catch (e2) {}
        }
    }

    /** Безопасно задаёт значение свойству эффекта по его отображаемому имени. */
    function trySet(effect, propName, value) {
        try {
            var p = effect.property(propName);
            if (p) p.setValue(value);
        } catch (e) {}
    }

    /**
     * Пробует добавить эффект по списку кандидатов (Match Name или display name).
     * Возвращает объект эффекта или null. Не роняет скрипт, если эффекта нет в сборке.
     */
    function safeAddEffect(layer, candidates) {
        var parade = layer.property("ADBE Effect Parade");
        for (var i = 0; i < candidates.length; i++) {
            var id = candidates[i];
            try { if (parade.canAddProperty(id)) return parade.addProperty(id); } catch (e) {}
            try { return parade.addProperty(id); } catch (e2) {}
        }
        return null;
    }

    /** Быстрый доступ к трансформациям слоя. */
    function T(layer) { return layer.property("ADBE Transform Group"); }

    /** Контейнер Contents шейп-слоя. */
    function shapeContents(layer) { return layer.property("ADBE Root Vectors Group"); }

    /** Добавляет заливку в контейнер контента шейпа. */
    function addFill(contents, r, g, b) {
        var f = contents.addProperty("ADBE Vector Graphic - Fill");
        setColor(f.property("ADBE Vector Fill Color"), r, g, b);
        return f;
    }

    /** Добавляет обводку в контейнер контента шейпа. */
    function addStroke(contents, r, g, b, width) {
        var s = contents.addProperty("ADBE Vector Graphic - Stroke");
        setColor(s.property("ADBE Vector Stroke Color"), r, g, b);
        s.property("ADBE Vector Stroke Width").setValue(width);
        try { s.property("ADBE Vector Stroke Line Cap").setValue(2); } catch (e) {} // round cap
        try { s.property("ADBE Vector Stroke Line Join").setValue(2); } catch (e) {} // round join
        return s;
    }

    /** Добавляет произвольный путь (Shape-объект) в контейнер контента. */
    function addPath(contents, shapeObj) {
        var p = contents.addProperty("ADBE Vector Shape - Group");
        p.property("ADBE Vector Shape").setValue(shapeObj);
        return p;
    }

    /**
     * Эффект свечения ADBE Glow с окраской в заданный неоновый цвет.
     * intensity держим низким для «мягкого, едва заметного» свечения.
     */
    function applyGlow(layer, r, g, b, radius, intensity, threshold) {
        var gl = safeAddEffect(layer, ["ADBE Glow"]);
        if (!gl) return null;
        trySet(gl, "Glow Threshold", threshold);
        trySet(gl, "Glow Radius", radius);
        trySet(gl, "Glow Intensity", intensity);
        try { gl.property("Glow Colors").setValue(2); } catch (e) {} // 2 = «A & B Colors»
        try { setColor(gl.property("Color A"), r, g, b); } catch (e) {}
        try { setColor(gl.property("Color B"), r, g, b); } catch (e) {}
        return gl;
    }

    /** Стиль слоя «Bevel and Emboss» для глянцевого объёма (например, у сердец). */
    function applyBevelEmboss(layer) {
        try {
            var styles = layer.property("ADBE Layer Styles");
            var bevel = styles.addProperty("ADBE Bevel/Emboss");
            trySet(bevel, "Size", 22);
            trySet(bevel, "Depth", 180);
            trySet(bevel, "Soften", 8);
            trySet(bevel, "Highlight Opacity", 90);
            trySet(bevel, "Shadow Opacity", 45);
            return bevel;
        } catch (e) { return null; }
    }

    /**
     * Создаёт две bezier-ключевые точки и делает Ease Out (плавное замедление к финалу).
     * Работает и для скаляров, и для векторов (Scale/Position) — размерность берётся из value.
     */
    function easeOutKeyframes(prop, t0, v0, t1, v1) {
        prop.setValueAtTime(t0, v0);
        prop.setValueAtTime(t1, v1);
        var k0 = prop.nearestKeyIndex(t0);
        var k1 = prop.nearestKeyIndex(t1);

        prop.setInterpolationTypeAtKey(k0, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
        prop.setInterpolationTypeAtKey(k1, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);

        var dim = 1;
        try { if (prop.value.length) dim = prop.value.length; } catch (e) { dim = 1; }

        var startIn = [], startOut = [], endIn = [], endOut = [];
        for (var i = 0; i < dim; i++) {
            startIn.push(new KeyframeEase(0, 33));
            startOut.push(new KeyframeEase(0, 33));
            endIn.push(new KeyframeEase(0, 90));   // сильное влияние на входе в финал => Ease Out
            endOut.push(new KeyframeEase(0, 90));
        }
        prop.setTemporalEaseAtKey(k0, startIn, startOut);
        prop.setTemporalEaseAtKey(k1, endIn, endOut);
    }

    // -- Строители геометрии ---------------------------------------------------------------

    /** Сердце как замкнутый bezier-путь радиуса r (центр в 0,0). */
    function heartShape(r) {
        var s = new Shape();
        s.vertices = [
            [0.0,       -0.30 * r], // верхняя впадина
            [1.00 * r,  -0.75 * r], // правая доля
            [0.0,        1.00 * r], // нижний кончик
            [-1.00 * r, -0.75 * r]  // левая доля
        ];
        s.inTangents = [
            [-0.55 * r, -0.40 * r],
            [0.0,       -0.45 * r],
            [0.75 * r,   0.20 * r],
            [0.0,        0.55 * r]
        ];
        s.outTangents = [
            [0.55 * r,  -0.40 * r],
            [0.0,        0.55 * r],
            [-0.75 * r,  0.20 * r],
            [0.0,       -0.45 * r]
        ];
        s.closed = true;
        return s;
    }

    /** Плюс/крестик как замкнутый путь; arm — половина ширины луча, len — половина длины. */
    function crossShape(arm, len) {
        var s = new Shape();
        s.vertices = [
            [-arm, -len], [arm, -len], [arm, -arm], [len, -arm],
            [len, arm], [arm, arm], [arm, len], [-arm, len],
            [-arm, arm], [-len, arm], [-len, -arm], [-arm, -arm]
        ];
        s.closed = true;
        return s; // прямые углы (tangents по умолчанию нулевые)
    }

    /** Волнистая лента: горизонтальный путь через всю ширину с плавными «горбами». */
    function ribbonShape(W, baseY, amp) {
        var s = new Shape();
        s.vertices = [
            [-40,        baseY + amp],
            [W * 0.20,   baseY - amp],
            [W * 0.40,   baseY + amp],
            [W * 0.60,   baseY - amp * 1.2],
            [W * 0.80,   baseY + amp * 0.4],
            [W + 40,     baseY - amp]
        ];
        var tx = W * 0.09;
        s.inTangents  = [[-tx, 0], [-tx, 0], [-tx, 0], [-tx, 0], [-tx, 0], [-tx, 0]];
        s.outTangents = [[tx, 0],  [tx, 0],  [tx, 0],  [tx, 0],  [tx, 0],  [tx, 0]];
        s.closed = false;
        return s;
    }

    // -- Фабрики слоёв окружения ------------------------------------------------------------

    /** Пятиконечная звезда (polystar). */
    function makeStar(comp, name, x, y, outerR, r, g, b) {
        var lyr = comp.layers.addShape();
        lyr.name = name;
        var c = shapeContents(lyr);
        var star = c.addProperty("ADBE Vector Shape - Star");
        try { star.property("ADBE Vector Star Type").setValue(1); } catch (e) {}          // 1 = star
        try { star.property("ADBE Vector Star Points").setValue(5); } catch (e) {}
        try { star.property("ADBE Vector Star Outer Radius").setValue(outerR); } catch (e) {}
        try { star.property("ADBE Vector Star Inner Radius").setValue(outerR * 0.46); } catch (e) {}
        try { star.property("ADBE Vector Star Outer Roundness").setValue(12); } catch (e) {}
        try { star.property("ADBE Vector Star Inner Roundness").setValue(12); } catch (e) {}
        addFill(c, r, g, b);
        T(lyr).property("ADBE Position").setValue([x, y]);
        return lyr;
    }

    /** Глянцевое сердце с фаской и свечением. */
    function makeHeart(comp, name, x, y, size, r, g, b) {
        var lyr = comp.layers.addShape();
        lyr.name = name;
        var c = shapeContents(lyr);
        addPath(c, heartShape(size));
        addFill(c, r, g, b);
        T(lyr).property("ADBE Position").setValue([x, y]);
        applyBevelEmboss(lyr);                 // Layer Style -> Bevel and Emboss (глянец)
        applyGlow(lyr, 1.0, 0.45, 0.75, size * 0.9, 0.7, 60);
        return lyr;
    }

    /** Неоновый плюс/крестик со свечением. */
    function makeCross(comp, name, x, y, size, r, g, b) {
        var lyr = comp.layers.addShape();
        lyr.name = name;
        var c = shapeContents(lyr);
        addPath(c, crossShape(size * 0.30, size));
        addFill(c, r, g, b);
        T(lyr).property("ADBE Position").setValue([x, y]);
        applyGlow(lyr, r, g, b, size * 1.4, 1.0, 40);
        return lyr;
    }

    /** Светящийся кружок. */
    function makeCircle(comp, name, x, y, size, r, g, b) {
        var lyr = comp.layers.addShape();
        lyr.name = name;
        var c = shapeContents(lyr);
        var el = c.addProperty("ADBE Vector Shape - Ellipse");
        el.property("ADBE Vector Ellipse Size").setValue([size, size]);
        addFill(c, r, g, b);
        T(lyr).property("ADBE Position").setValue([x, y]);
        applyGlow(lyr, r, g, b, size * 1.6, 1.0, 30);
        return lyr;
    }

    /** Цветок на ленте: белая «звёздочка-цветок» + жёлтая сердцевина. */
    function makeFlower(comp, name, x, y, size) {
        var lyr = comp.layers.addShape();
        lyr.name = name;
        var c = shapeContents(lyr);
        // Лепестки
        var petals = c.addProperty("ADBE Vector Shape - Star");
        try { petals.property("ADBE Vector Star Type").setValue(1); } catch (e) {}
        try { petals.property("ADBE Vector Star Points").setValue(5); } catch (e) {}
        try { petals.property("ADBE Vector Star Outer Radius").setValue(size); } catch (e) {}
        try { petals.property("ADBE Vector Star Inner Radius").setValue(size * 0.55); } catch (e) {}
        try { petals.property("ADBE Vector Star Outer Roundness").setValue(100); } catch (e) {}
        try { petals.property("ADBE Vector Star Inner Roundness").setValue(100); } catch (e) {}
        addFill(c, 1.0, 1.0, 1.0);
        // Сердцевина
        var core = c.addProperty("ADBE Vector Shape - Ellipse");
        core.property("ADBE Vector Ellipse Size").setValue([size * 0.5, size * 0.5]);
        addFill(c, 1.0, 0.85, 0.25);
        T(lyr).property("ADBE Position").setValue([x, y]);
        return lyr;
    }

    // -- Анимация ---------------------------------------------------------------------------

    /** Фаза A: масштаб 0 -> 100 за [0..2] c с Ease Out. */
    function animateScaleIn(layer) {
        easeOutKeyframes(T(layer).property("ADBE Scale"), 0, [0, 0], 2, [100, 100]);
    }

    /** Фаза A: «заплывание» по Position снизу к финальной точке за [0..2] c с Ease Out. */
    function animatePositionIn(layer) {
        var pos = T(layer).property("ADBE Position");
        var fin = pos.value;
        easeOutKeyframes(pos, 0, [fin[0], fin[1] + 260], 2, [fin[0], fin[1]]);
    }

    /** Фаза B: бесконечное покачивание по Y поверх текущего значения Position. */
    function loopBob(layer) {
        T(layer).property("ADBE Position").expression = "value + [0, Math.sin(time * 3) * 20];";
    }

    /** Фаза B: непрерывное медленное вращение. */
    function loopSpin(layer) {
        T(layer).property("ADBE Rotate Z").expression = "time * 25;";
    }


    // ---------------------------------------------------------------------------------------
    // 1. ИНТЕРАКТИВНОСТЬ: выбор файла ДО открытия Undo-группы
    // ---------------------------------------------------------------------------------------

    var videoFile = File.openDialog(
        "Выберите видео с персонажем",
        "*.mp4;*.mov;*.avi",   // Windows-фильтр; на macOS фильтр-строка игнорируется, диалог откроется
        false
    );
    if (!videoFile) {
        alert("Файл не выбран. Скрипт остановлен.");
        return;
    }

    app.beginUndoGroup("Генерация Кавайной Сцены с Видео AE 2026");

    try {
        // -----------------------------------------------------------------------------------
        // 2. КОМПОЗИЦИЯ: используем активную или создаём новую
        // -----------------------------------------------------------------------------------
        var comp = null;
        if (app.project.activeItem && (app.project.activeItem instanceof CompItem)) {
            comp = app.project.activeItem;
        }
        if (!comp) {
            comp = app.project.items.addComp("Kawaii Neon Scene", 1920, 1080, 1.0, 10, 29.97);
        }
        if (!comp || !(comp instanceof CompItem)) {
            alert("Не удалось получить или создать композицию. Скрипт остановлен.");
            return;
        }
        comp.openInViewer();

        var W = comp.width;
        var H = comp.height;

        // -----------------------------------------------------------------------------------
        // 4a. ФОН: тёмно-фиолетовый солид (создаём первым => окажется в самом низу стека)
        // -----------------------------------------------------------------------------------
        var bg = comp.layers.addSolid([0.12, 0.03, 0.22], "BG_DarkPurple", W, H, 1.0, comp.duration);

        // -----------------------------------------------------------------------------------
        // 4b. ЛЕНТА + ЦВЕТЫ
        // -----------------------------------------------------------------------------------
        var ribbonBaseY = H * 0.16;
        var ribbonAmp = H * 0.06;

        var ribbon = comp.layers.addShape();
        ribbon.name = "Ribbon";
        var rc = shapeContents(ribbon);
        addPath(rc, ribbonShape(W, ribbonBaseY, ribbonAmp));
        addStroke(rc, 1.0, 0.42, 0.72, 58);
        T(ribbon).property("ADBE Position").setValue([0, 0]); // путь задан в координатах композиции
        applyGlow(ribbon, 1.0, 0.4, 0.72, 40, 0.8, 50);
        animatePositionIn(ribbon);

        // Цветы равномерно вдоль ленты (Y повторяет форму горбов)
        var flowerX = [W * 0.10, W * 0.20, W * 0.30, W * 0.40, W * 0.50, W * 0.60, W * 0.72, W * 0.82, W * 0.92];
        var flowerY = [ribbonBaseY, ribbonBaseY - ribbonAmp, ribbonBaseY + ribbonAmp * 0.4, ribbonBaseY + ribbonAmp,
                       ribbonBaseY, ribbonBaseY - ribbonAmp * 1.2, ribbonBaseY - ribbonAmp * 0.6, ribbonBaseY + ribbonAmp * 0.4, ribbonBaseY - ribbonAmp];
        for (var fi = 0; fi < flowerX.length; fi++) {
            var fl = makeFlower(comp, "Flower_" + (fi + 1), flowerX[fi], flowerY[fi], 26 + (fi % 3) * 4);
            animatePositionIn(fl);
            loopSpin(fl); // Фаза B: медленное вращение цветов на ленте
        }

        // -----------------------------------------------------------------------------------
        // 4c. КРУПНЫЕ ЭЛЕМЕНТЫ: сердца и большие звёзды
        // -----------------------------------------------------------------------------------
        var hearts = [
            [W * 0.25, H * 0.50, 95],
            [W * 0.83, H * 0.60, 105],
            [W * 0.91, H * 0.49, 66],
            [W * 0.11, H * 0.85, 62],
            [W * 0.87, H * 0.86, 58]
        ];
        for (var hi = 0; hi < hearts.length; hi++) {
            var ht = makeHeart(comp, "Heart_" + (hi + 1), hearts[hi][0], hearts[hi][1], hearts[hi][2], 1.0, 0.28, 0.60);
            animateScaleIn(ht); // Фаза A: рост 0 -> 100
            loopBob(ht);        // Фаза B: покачивание
        }

        // Большая жёлтая звезда (правый верх)
        var bigStar = makeStar(comp, "Star_Big", W * 0.63, H * 0.19, 130, 1.0, 0.82, 0.15);
        applyGlow(bigStar, 1.0, 0.85, 0.3, 90, 1.0, 40);
        animateScaleIn(bigStar);
        loopBob(bigStar);
        loopSpin(bigStar);

        // -----------------------------------------------------------------------------------
        // 4d. МЕЛКИЕ ДЕТАЛИ: маленькие звёзды, неоновые плюсы, кружки
        // -----------------------------------------------------------------------------------
        var smallStars = [
            [W * 0.38, H * 0.32, 30], [W * 0.70, H * 0.45, 26], [W * 0.55, H * 0.68, 24],
            [W * 0.30, H * 0.72, 22], [W * 0.68, H * 0.75, 28], [W * 0.47, H * 0.26, 20]
        ];
        for (var si = 0; si < smallStars.length; si++) {
            var st = makeStar(comp, "Star_Small_" + (si + 1), smallStars[si][0], smallStars[si][1], smallStars[si][2], 1.0, 0.82, 0.15);
            applyGlow(st, 1.0, 0.85, 0.3, smallStars[si][2] * 1.5, 1.0, 40);
            animateScaleIn(st);
            loopBob(st);
            loopSpin(st);
        }

        var crosses = [
            [W * 0.16, H * 0.45, 22, 0.78, 0.55, 1.0],
            [W * 0.75, H * 0.62, 26, 1.0, 0.55, 0.9],
            [W * 0.90, H * 0.68, 20, 0.78, 0.55, 1.0],
            [W * 0.60, H * 0.86, 18, 1.0, 0.6, 0.85],
            [W * 0.35, H * 0.50, 18, 0.85, 0.7, 1.0]
        ];
        for (var ci = 0; ci < crosses.length; ci++) {
            var cr = makeCross(comp, "Cross_" + (ci + 1), crosses[ci][0], crosses[ci][1], crosses[ci][2],
                               crosses[ci][3], crosses[ci][4], crosses[ci][5]);
            animatePositionIn(cr);
        }

        var circles = [
            [W * 0.11, H * 0.60, 34, 0.30, 0.90, 0.80],
            [W * 0.50, H * 0.92, 18, 1.0, 0.50, 0.80],
            [W * 0.42, H * 0.78, 14, 1.0, 0.80, 0.35]
        ];
        for (var oi = 0; oi < circles.length; oi++) {
            var ob = makeCircle(comp, "Circle_" + (oi + 1), circles[oi][0], circles[oi][1], circles[oi][2],
                                circles[oi][3], circles[oi][4], circles[oi][5]);
            animatePositionIn(ob);
        }

        // Множество мелких искр-звёздочек (лёгкое «звёздное поле»)
        for (var sp = 0; sp < 16; sp++) {
            var sx = 60 + Math.random() * (W - 120);
            var sy = 40 + Math.random() * (H * 0.85);
            var sparkle = makeStar(comp, "Sparkle_" + (sp + 1), sx, sy, 5 + Math.random() * 5, 1.0, 1.0, 0.85);
            applyGlow(sparkle, 1.0, 1.0, 0.9, 16, 1.0, 20);
            animateScaleIn(sparkle);
        }

        // -----------------------------------------------------------------------------------
        // 1 (продолжение). ИМПОРТ ВИДЕО + добавление поверх фона по центру
        // -----------------------------------------------------------------------------------
        var footageItem;
        try {
            footageItem = app.project.importFile(new ImportOptions(videoFile));
        } catch (impErr) {
            alert("Не удалось импортировать видео:\n" + impErr.toString());
            return;
        }

        var charLayer = comp.layers.add(footageItem); // добавляется наверх стека => персонаж спереди
        charLayer.name = "Character";

        // Центрируем и вписываем по высоте (~68% высоты композиции)
        var srcW = footageItem.width;
        var srcH = footageItem.height;
        var fitScale = (H * 0.68) / srcH * 100;
        T(charLayer).property("ADBE Scale").setValue([fitScale, fitScale]);
        var charX = W / 2;
        var charY = H / 2;
        T(charLayer).property("ADBE Position").setValue([charX, charY]);

        var displayH = srcH * (fitScale / 100); // видимая высота персонажа в пикселях

        // -----------------------------------------------------------------------------------
        // 1. УДАЛЕНИЕ ЗЕЛЁНОГО ФОНА (Keylight) + фолбэк
        // -----------------------------------------------------------------------------------
        // ВНИМАНИЕ: Keylight — плагин The Foundry, поставляемый с AE. Его Match Name зависит от
        // сборки; поэтому пробуем несколько кандидатов и, если ничего не нашлось, откатываемся
        // на встроенный Linear Color Key. (Match Name "ADBE Keylight2" из ТЗ не гарантирован —
        // см. пояснения в ответе.)
        var keyer = safeAddEffect(charLayer, ["ADBE Keylight2", "Keylight (1.2)", "Keylight"]);
        if (keyer) {
            // Screen Colour = чистый зелёный (RGB 0,255,0 => [0,1,0])
            try { setColor(keyer.property("Screen Colour"), 0, 1, 0); }
            catch (e) { try { setColor(keyer.property("Screen Color"), 0, 1, 0); } catch (e2) {} }
        } else {
            keyer = safeAddEffect(charLayer, ["ADBE Linear Color Key", "ADBE Color Key"]);
            if (keyer) {
                try { setColor(keyer.property("Key Color"), 0, 1, 0); } catch (e) {}
                trySet(keyer, "Matching Tolerance", 22);
                trySet(keyer, "Matching Softness", 12);
            } else {
                alert("Не найден ни Keylight, ни Linear Color Key. Хромакей не применён.");
            }
        }

        // -----------------------------------------------------------------------------------
        // 2. СТИЛИЗАЦИЯ ПЕРСОНАЖА
        // -----------------------------------------------------------------------------------
        // 2.1 Тонирование Tint: тёмные -> фиолетовый, светлые -> розовый (гасит зелёный рефлекс)
        var tint = safeAddEffect(charLayer, ["ADBE Tint"]);
        if (tint) {
            setColor(tint.property("Map Black To"), 0.28, 0.06, 0.42); // фиолетовый в тенях/средних
            setColor(tint.property("Map White To"), 1.0, 0.86, 0.95);  // розоватый в светах
            trySet(tint, "Amount to Tint", 38);                        // умеренно, чтобы сохранить персонажа
        }

        // 2.2 Мягкое розовое свечение по краям
        applyGlow(charLayer, 1.0, 0.45, 0.78, 24, 0.5, 78);

        // 2.3 Контурный свет через Drop Shadow (эффект "ADBE Drop Shadow")
        //     ВАЖНО: у ЭФФЕКТА Drop Shadow нет параметра «Shadow Mode/Screen» — режим наложения
        //     есть только у СТИЛЯ СЛОЯ Drop Shadow. Здесь задаём Distance=0 и Softness=18, а
        //     «экранное» розовое сияние обеспечивает Glow выше. (Подробности — в ответе.)
        var dShadow = safeAddEffect(charLayer, ["ADBE Drop Shadow"]);
        if (dShadow) {
            setColor(dShadow.property("Shadow Color"), 1.0, 0.20, 0.70); // ярко-розовый
            trySet(dShadow, "Opacity", 200);      // 0..255
            trySet(dShadow, "Direction", 0);
            trySet(dShadow, "Distance", 0);        // смещение 0
            trySet(dShadow, "Softness", 18);       // размытие 15–20
        }

        // -----------------------------------------------------------------------------------
        // 3. ЗЕРКАЛЬНЫЙ ПОЛ (дубликат персонажа со всеми эффектами)
        // -----------------------------------------------------------------------------------
        var reflection = charLayer.duplicate(); // дубликат появляется НАД оригиналом...
        reflection.name = "Character_Reflection";
        reflection.moveAfter(charLayer);        // ...перемещаем под персонажа

        // Переворот по вертикали: Scale Y = -100%
        var refScale = T(reflection).property("ADBE Scale");
        refScale.setValue([fitScale, -fitScale]);

        // Смещаем вниз, под ноги персонажу (низ персонажа = charY + displayH/2)
        T(reflection).property("ADBE Position").setValue([charX, charY + displayH]);

        // Приглушаем и переводим в Screen
        T(reflection).property("ADBE Opacity").setValue(25);
        reflection.blendingMode = BlendingMode.SCREEN;

        // Размытие отражения — АКТУАЛЬНЫЙ Match Name "ADBE Box Blur"
        // (у эффекта с отображаемым именем «Fast Box Blur» Match Name всегда был "ADBE Box Blur";
        //  отдельного "ADBE Fast Box Blur" не существует — см. пояснения в ответе).
        var boxBlur = safeAddEffect(reflection, ["ADBE Box Blur"]);
        if (boxBlur) {
            trySet(boxBlur, "Blur Radius", 14);
            trySet(boxBlur, "Iterations", 2);
            try { boxBlur.property("Repeat Edge Pixels").setValue(true); } catch (e) {}
        }

    } catch (err) {
        alert("Ошибка при генерации сцены:\n" + err.toString() +
              (err.line ? ("\nСтрока: " + err.line) : ""));
    } finally {
        app.endUndoGroup();
    }

})();
