/**
 * linkedui — site/app.js (theme builder)
 * ======================================
 * Enhancement for `site/index.html`. Without JS the page stays usable
 * (defaults + export snippet copyable by hand); with JS it goes live:
 * controls → preview (+ optionally whole page) → export (copy/download/share link).
 *
 * Core ideas:
 * - Number fields are the source of truth (wider value range), sliders follow.
 * - Derived values (surface, hover, border …) are computed from 3 base colors +
 *   contrast, so nothing falls apart (e.g. light bg + dark surface from
 *   the system dark mode).
 * - `dirty` flag: page-wide overrides only after the first change —
 *   otherwise builder defaults would override theme choice and dark mode.
 * - Builder state lives in the URL (query params) → reload-safe + shareable.
 *
 * @module builder
 */
(() => {
  const $ = (id) => document.getElementById(id);
  const controls = $("controls"), preview = $("preview"), out = $("lui-export");
  if (!controls || !preview || !out) return;

  const els = {
    name: $("in-name"), primary: $("in-primary"), secondary: $("in-secondary"), bg: $("in-bg"), text: $("in-text"),
    contrast: $("in-contrast"), contrastNum: $("in-contrast-num"),
    radius: $("in-radius"), radiusNum: $("in-radius-num"),
    densX: $("in-density-x"), densXNum: $("in-density-x-num"),
    densY: $("in-density-y"), densYNum: $("in-density-y-num"),
    shape: $("in-shape"), curve: $("in-curve"), curveNum: $("in-curve-num"),
    outR: $("out-radius"), outDX: $("out-density-x"), outDY: $("out-density-y"), outC: $("out-curve"),
    outCT: $("out-contrast"), livePage: $("in-live-page"),
  };

  /**
   * Normalize a theme name to a valid `data-theme` slug.
   * @param {string} s raw name from the text field
   * @returns {string} lowercase slug (`my-theme`), fallback `"my-theme"`
   */
  const slug = (s) => (s || "my-theme").toLowerCase().trim().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "my-theme";
  /**
   * Clamp a number to a range.
   * @param {number} v value
   * @param {number} min lower bound
   * @param {number} max upper bound
   * @returns {number} clamped value
   */
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  /**
   * Read a number field robustly (empty/invalid input → fallback).
   * @param {HTMLInputElement|null} el number input
   * @param {number} fb fallback value
   * @returns {number} parsed number or fallback
   */
  const num = (el, fb) => {
    const v = parseFloat(el && el.value);
    return Number.isFinite(v) ? v : fb;
  };

  // Effective values (number field, limited to sensible custom ranges).
  // Sliders may be narrower — custom values stay valid in the number field.
  /** @returns {number} box radius in px (0–64) */
  const radiusVal = () => clamp(num(els.radiusNum, 12), 0, 64);
  /** @returns {number} squircle exponent K (0.5–3) */
  const curveVal = () => clamp(num(els.curveNum, 1.3), 0.5, 3);
  /** @returns {number} horizontal density (0.5–2) */
  const densXVal = () => clamp(num(els.densXNum, 1), 0.5, 2);
  /** @returns {number} vertical density (0.5–2) */
  const densYVal = () => clamp(num(els.densYNum, 1), 0.5, 2);

  /**
   * Sync sliders to number values (possibly at the stop — custom value stays in the field).
   * @returns {void}
   */
  function syncRanges() {
    if (els.radius) els.radius.value = clamp(radiusVal(), 0, 24);
    if (els.curve) els.curve.value = clamp(curveVal(), 0.8, 2);
    if (els.densX) els.densX.value = clamp(densXVal(), 0.85, 1.3);
    if (els.densY) els.densY.value = clamp(densYVal(), 0.85, 1.3);
    if (els.contrast) els.contrast.value = clamp(num(els.contrastNum, 50), 0, 100);
  }

  // Compensation: higher K looks more square → radius grows with
  // compensated = base × (0.5 + 0.5 × K). ONLY apply where superellipse
  // is supported — otherwise the radius would get too round without shape.
  /**
   * Compensation factor for squircle: K=1 → 1, K=1.3 → 1.15, K=2 → 1.5.
   * @param {number} k superellipse exponent
   * @returns {number} radius multiplier
   */
  const squirFactor = (k) => 0.5 + 0.5 * k;
  /**
   * Check `corner-shape: superellipse()` support (for radius compensation).
   * @returns {boolean} true when the browser supports superellipse
   */
  const squirSupported = () => {
    try {
      return typeof CSS !== "undefined" && !!CSS.supports && CSS.supports("corner-shape", "superellipse(1)");
    } catch { return false; }
  };
  /**
   * Round to 1 decimal (for px values in the export).
   * @param {number} v value
   * @returns {number} rounded value
   */
  const r1 = (v) => Math.round(v * 10) / 10;

  // Box radius (cards, panels, dialogs) comes from the radius value.
  // Control radius (buttons, inputs, selects) comes from the shape choice —
  // so pill only rounds controls, never boxes.
  // box/control = live-effective (possibly compensated), baseBox/baseControl = uncompensated
  // for the export, compBox/compControl = compensated for the @supports block.
  /**
   * Resolve shape from radius + shape choice + curve.
   * @returns {{box: string, control: string, baseBox?: string, baseControl?: string, compBox?: string, compControl?: string, corner: string}} px values + corner shape
   */
  function shapeVars() {
    const r = radiusVal();
    const shape = els.shape.value, curve = curveVal();
    if (shape === "sharp") return { box: "0px", control: "0px", corner: "round" };
    if (shape === "pill") return { box: `${r}px`, control: "999px", corner: "round" };
    if (shape === "squircle") {
      const v = Math.max(r, 14);
      const c = r1(v * squirFactor(curve));
      const live = squirSupported() ? c : v;
      return {
        box: `${live}px`, control: `${live}px`,
        baseBox: `${v}px`, baseControl: `${v}px`,
        compBox: `${c}px`, compControl: `${c}px`,
        corner: `superellipse(${curve})`,
      };
    }
    return { box: `${r}px`, control: `${r}px`, corner: "round" };
  }

  /**
   * Mix two colors in OKLCH (export uses color-mix → no JS needed at runtime).
   * @param {string} a first color (hex)
   * @param {string} b second color (hex or keyword)
   * @param {number} pct share of a in percent
   * @returns {string} `color-mix(…)` expression
   */
  const mix = (a, b, pct) => `color-mix(in oklch, ${a} ${pct}%, ${b})`;

  // Border share grows with contrast (8→28%) so borders stay visible on #000
  /**
   * Derive border text share from contrast (0..1).
   * @param {number} ct contrast 0..1
   * @returns {number} percent 8..28
   */
  const borderShare = (ct) => r1(8 + 20 * ct);

  // Contrast 0..1: drives mix share (100→72% bg) and lightness floor (0.10→0.38).
  // Default 0.5 = previous behavior (86% / 0.24).
  /** @returns {number} contrast 0..1 from the number field (default 0.5) */
  const contrastVal = () => clamp(num(els.contrastNum, 50), 0, 100) / 100;
  /**
   * Surface primary share from contrast — surface is tinted with primary
   * (never colorless, even on #000).
   * @param {number} ct contrast 0..1
   * @returns {number} percent 3..11
   */
  const mixShare = (ct) => r1(3 + 8 * ct);
  /**
   * Lightness floor for surface (minimum brightness, e.g. on #000 background).
   * @param {number} ct contrast 0..1
   * @returns {number} OKLCH lightness 0.10..0.38
   */
  const floorVal = (ct) => Math.round((0.10 + 0.28 * ct) * 100) / 100;
  /**
   * Surface with lightness floor (second declaration in the export = modern
   * enhancement, old browsers ignore the line and take the plain mix).
   * @param {string} primary primary hex (tint source)
   * @param {string} bg background hex
   * @param {number} ct contrast 0..1
   * @returns {string} `oklch(from … max(l, …) …)` expression
   */
  const surfaceHi = (primary, bg, ct) => `oklch(from ${mix(primary, bg, mixShare(ct))} max(l, ${floorVal(ct).toFixed(2)}) c h)`;

  // Build chevron matching the text color (hex → %23-encoded for data URI)
  /**
   * Select arrow as SVG data URI in text color.
   * @param {string} hex text color as hex
   * @returns {string} `url("data:image/svg+xml,…")`
   */
  const chev = (hex) => `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23${(hex || "#333a48").replace("#", "")}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

  /**
   * Relative luminance (WCAG formula) — decides on-primary/on-secondary (light/dark).
   * @param {string} hex color as hex
   * @returns {number} luminance 0..1 (invalid → 0)
   */
  function luminance(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
    if (!m) return 0;
    const c = [0, 2, 4].map((i) => {
      const v = parseInt(m[1].substr(i, 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  // CSS color (oklch(), …) → #hex via canvas normalization
  /**
   * Convert any CSS color to hex (used when loading a theme into the builder).
   * @param {string} css any CSS color value
   * @returns {string|null} `#rrggbb` or null when unparseable
   */
  let _cv = null;
  function cssToHex(css) {
    try {
      _cv = _cv || document.createElement("canvas").getContext("2d");
      _cv.fillStyle = "#000000";
      _cv.fillStyle = (css || "").trim().toLowerCase();
      const v = String(_cv.fillStyle);
      const hex = /^#([0-9a-f]{6})$/i.exec(v);
      if (hex) return `#${hex[1].toLowerCase()}`;
      const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(v);
      if (!rgb) return null;
      const to = (n) => clamp(Math.round(Number(n)), 0, 255).toString(16).padStart(2, "0");
      return `#${to(rgb[1])}${to(rgb[2])}${to(rgb[3])}`;
    } catch { return null; }
  }

  // Derive all dependent values from the 3 base colors so nothing falls apart
  // (e.g. light bg + dark surface from the system dark mode).
  /**
   * Derive all theme values from the controls (colors, radii, densities, chevron …).
   * @returns {object} derived theme object for export + live application
   */
  function derived() {
    const sv = shapeVars();
    const { box, control, corner } = sv;
    const primary = els.primary.value, secondary = els.secondary.value, bg = els.bg.value, text = els.text.value;
    const ct = contrastVal();
    const share = mixShare(ct);
    return {
      radius: box, control, corner,
      baseBox: sv.baseBox || box,
      baseControl: sv.baseControl || control,
      compBox: sv.compBox || box,
      compControl: sv.compControl || control,
      isSquircle: els.shape.value === "squircle",
      contrast: Math.round(ct * 100),
      contrastRaw: Math.round(ct * 100) / 100,
      densityX: densXVal().toFixed(2),
      densityY: densYVal().toFixed(2),
      primary, secondary, bg, text,
      hover: mix(primary, "black", 88),
      active: mix(primary, "black", 78),
      onPrimary: luminance(primary) > 0.45 ? "#1c2333" : "#ffffff",
      secondaryHover: mix(secondary, "black", 88),
      secondaryActive: mix(secondary, "black", 78),
      onSecondary: luminance(secondary) > 0.45 ? "#1c2333" : "#ffffff",
      surface: mix(primary, bg, share),
      surfaceHi: surfaceHi(primary, bg, ct),
      muted: mix(text, bg, 62),
      border: mix(text, bg, borderShare(ct)),
      chevron: chev(text),
    };
  }

  /** @constant {string[]} All inline-managed custom properties (for clearVars). */
  const MANAGED = ["--lui-primary", "--lui-primary-hover", "--lui-primary-active",
    "--lui-on-primary", "--lui-secondary", "--lui-secondary-hover", "--lui-secondary-active",
    "--lui-on-secondary", "--lui-bg", "--lui-surface", "--lui-text", "--lui-muted",
    "--lui-border", "--lui-chevron", "--lui-contrast", "--lui-radius", "--lui-radius-control",
    "--lui-density-x", "--lui-density-y", "--lui-corner-shape"];

  /**
   * Apply a derived theme as inline variables to an element
   * (preview, or `:root` for page-wide).
   * @param {HTMLElement} el target element
   * @param {object} d result of {@link derived}
   * @returns {void}
   */
  function applyVars(el, d) {
    // Set color explicitly: custom properties alone don't change inherited `color`
    // (body sets color via var() with :root values — descendants without their own var() would keep the old color)
    el.style.color = d.text;
    el.style.setProperty("--lui-primary", d.primary);
    el.style.setProperty("--lui-primary-hover", d.hover);
    el.style.setProperty("--lui-primary-active", d.active);
    el.style.setProperty("--lui-on-primary", d.onPrimary);
    el.style.setProperty("--lui-secondary", d.secondary);
    el.style.setProperty("--lui-secondary-hover", d.secondaryHover);
    el.style.setProperty("--lui-secondary-active", d.secondaryActive);
    el.style.setProperty("--lui-on-secondary", d.onSecondary);
    el.style.setProperty("--lui-bg", d.bg);
    el.style.setProperty("--lui-surface", d.surface);
    // Browsers silently ignore invalid values → fallback stays in place
    el.style.setProperty("--lui-surface", d.surfaceHi);
    el.style.setProperty("--lui-text", d.text);
    el.style.setProperty("--lui-muted", d.muted);
    el.style.setProperty("--lui-border", d.border);
    el.style.setProperty("--lui-chevron", d.chevron);
    el.style.setProperty("--lui-contrast", String(d.contrastRaw));
    el.style.setProperty("--lui-radius", d.radius);
    el.style.setProperty("--lui-radius-control", d.control);
    el.style.setProperty("--lui-density-x", d.densityX);
    el.style.setProperty("--lui-density-y", d.densityY);
    el.style.setProperty("--lui-corner-shape", d.corner);
  }
  // Page-wide only after the first change (otherwise defaults would override theme choice/dark mode)
  let dirty = false;
  /**
   * Remove all managed inline variables (+ `color`) from an element.
   * @param {HTMLElement} el target element
   * @returns {void}
   */
  function clearVars(el) {
    MANAGED.forEach((p) => el.style.removeProperty(p));
    el.style.removeProperty("color");
  }
  /**
   * Remove page-wide overrides (theme choice applies again).
   * @returns {void}
   */
  function clearPage() {
    clearVars(document.documentElement);
  }
  /**
   * Build the export snippet for `themes.css` (`[data-theme="<slug>"]` + optional
   * @supports compensation). Also present without JS as default text in `<pre>`.
   * @returns {string} CSS snippet
   */
  function snippet() {
    const name = slug(els.name.value);
    const d = derived();
    return `[data-theme="${name}"] {\n` +
      `  --lui-primary: ${d.primary};\n` +
      `  --lui-on-primary: ${d.onPrimary};\n` +
      `  --lui-secondary: ${d.secondary};\n` +
      `  --lui-on-secondary: ${d.onSecondary};\n` +
      `  --lui-bg: ${d.bg};\n` +
      `  --lui-surface: ${d.surface};\n` +
      `  --lui-surface: ${d.surfaceHi};\n` +
      `  --lui-text: ${d.text};\n` +
      `  --lui-muted: ${d.muted};\n` +
      `  --lui-border: ${d.border};\n` +
      `  --lui-chevron: ${d.chevron};\n` +
      `  --lui-contrast: ${d.contrastRaw.toFixed(2)};\n` +
      `  --lui-radius: ${d.baseBox};\n` +
      `  --lui-radius-control: ${d.baseControl};\n` +
      `  --lui-density-x: ${d.densityX};\n` +
      `  --lui-density-y: ${d.densityY};\n` +
      `  --lui-corner-shape: ${d.corner};\n` +
      `}` +
      // Compensated radius only inside @supports — base radius applies without shape support.
      // Always exported (even when THIS browser doesn't compensate) so it's right everywhere.
      (d.isSquircle && d.compBox !== d.baseBox
        ? `\n/* Radius compensation for superellipse (only where supported): ${d.baseBox} × ${squirFactor(curveVal()).toFixed(2)} */\n` +
          `@supports (corner-shape: superellipse(1)) {\n` +
          `  [data-theme="${name}"] {\n` +
          `    --lui-radius: ${d.compBox};\n` +
          `    --lui-radius-control: ${d.compControl};\n` +
          `  }\n}`
        : ``);
  }

  /**
   * Build the complete theme file (light block + dark override + system auto).
   * @returns {string} file contents for download/copy
   */
  function fullFile() {
    const name = slug(els.name.value);
    const d = derived();
    const light = snippet();
    const dark = `[data-mode="dark"][data-theme="${name}"] {\n  color-scheme: dark;\n  --lui-primary: ${d.primary};\n  --lui-on-primary: ${d.onPrimary};\n  --lui-secondary: ${d.secondary};\n  --lui-on-secondary: ${d.onSecondary};\n  --lui-bg: #161b28;\n  --lui-surface: #222839;\n  --lui-text: #f2f3f5;\n  --lui-muted: #9aa3b5;\n  --lui-border: color-mix(in oklch, #f2f3f5 22%, #161b28);\n  --lui-chevron: ${chev("#e8eaf0")};\n}\n@media (prefers-color-scheme: dark) {\n  [data-mode="auto"][data-theme="${name}"] {\n    color-scheme: dark;\n    --lui-primary: ${d.primary};\n    --lui-on-primary: ${d.onPrimary};\n    --lui-secondary: ${d.secondary};\n    --lui-on-secondary: ${d.onSecondary};\n    --lui-bg: #161b28;\n    --lui-surface: #222839;\n    --lui-text: #f2f3f5;\n    --lui-muted: #9aa3b5;\n    --lui-border: color-mix(in oklch, #f2f3f5 22%, #161b28);\n    --lui-chevron: ${chev("#e8eaf0")};\n  }\n}`;
    return `/* linkedui theme: ${name} — paste into themes.css */\n${light}\n${dark}\n`;
  }

  // apply=false: outputs + export update only (no layout shift while sliding),
  // apply=true: additionally apply preview/page
  /**
   * Central render: outputs + export always, preview/page only when `apply`.
   * Density controls use draft mode (apply on release) so the layout doesn't
   * shift under the cursor. Calls {@link schedulePushUrl} (debounced) at the end.
   * @param {boolean} [apply=true] apply preview/page or show draft only
   * @returns {void}
   */
  function render(apply = true) {
    syncRanges();
    const d = derived();
    if (els.outR) els.outR.textContent = els.shape.value === "pill"
      ? `${d.baseBox} / pill`
      : (d.isSquircle && d.radius !== d.baseBox ? `${d.baseBox} → ${d.radius}` : d.baseBox);
    if (els.outDX) els.outDX.textContent = d.densityX;
    if (els.outDY) els.outDY.textContent = d.densityY;
    if (els.outC) els.outC.textContent = els.shape.value === "squircle" ? String(curveVal()) : "—";
    if (els.outCT) els.outCT.textContent = `${d.contrast}%`;
    if (els.curve) els.curve.disabled = els.shape.value !== "squircle";
    if (els.curveNum) els.curveNum.disabled = els.shape.value !== "squircle";

    // Preview: follow the page theme before the first change (e.g. dark in dark mode),
    // show the edited theme afterwards — don't touch anything in draft mode
    if (!apply) {
      out.textContent = snippet();
      return;
    }
    if (dirty) {
      applyVars(preview, d);
    } else {
      clearVars(preview);
    }
    // Show values page-wide too (toggleable via checkbox, but only after the
    // first change — otherwise defaults would override theme choice/dark mode)
    if (dirty && els.livePage && els.livePage.checked) {
      applyVars(document.documentElement, d);
    } else {
      // Toggle off / nothing changed yet: remove page-wide overrides, preview stays
      clearPage();
    }
    // corner-shape applies globally via CSS (@supports) — no JS needed

    out.textContent = snippet();
    schedulePushUrl();
  }

  /**
   * Load the active theme (chosen top-right) into the builder inputs.
   * Resets `dirty` (preview/page follow the theme again).
   * @returns {void}
   */
  function loadThemeIntoBuilder() {
    let cs = null;
    try { cs = getComputedStyle(document.documentElement); } catch { return; }
    const get = (n) => (cs.getPropertyValue(n) || "").trim();
    const set = (el, v) => { if (el && v !== null && v !== undefined && v !== "") el.value = v; };
    set(els.primary, cssToHex(get("--lui-primary")));
    set(els.secondary, cssToHex(get("--lui-secondary")));
    set(els.bg, cssToHex(get("--lui-bg")));
    set(els.text, cssToHex(get("--lui-text")));
    const corner = get("--lui-corner-shape");
    const sm = /superellipse\(\s*([0-9.]+)\s*\)/.exec(corner || "");
    const control = get("--lui-radius-control");
    const baseR = parseFloat(get("--lui-radius"));
    if (sm) {
      els.shape.value = "squircle";
      const k = parseFloat(sm[1]) || 1.3;
      // Reverse the compensation — but only if THIS browser applied it
      const base = !Number.isFinite(baseR) ? 12
        : squirSupported() ? r1(baseR / squirFactor(k)) : Math.round(baseR);
      set(els.radiusNum, String(base));
      set(els.curveNum, String(k));
    } else if (control === "999px") {
      els.shape.value = "pill";
      if (Number.isFinite(baseR)) set(els.radiusNum, String(Math.round(baseR)));
    } else if (control === "0px" || baseR === 0) {
      els.shape.value = "sharp";
    } else {
      els.shape.value = "rounded";
      if (Number.isFinite(baseR)) set(els.radiusNum, String(Math.round(baseR)));
    }
    const dx = parseFloat(get("--lui-density-x")), dy = parseFloat(get("--lui-density-y"));
    if (Number.isFinite(dx)) set(els.densXNum, String(dx));
    if (Number.isFinite(dy)) set(els.densYNum, String(dy));
    const ct = parseFloat(get("--lui-contrast"));
    if (Number.isFinite(ct)) set(els.contrastNum, String(Math.round(clamp(ct, 0, 1) * 100)));
    dirty = false;
    render();
  }

  // Builder state → URL (share/reload-safe), debounced
  /** @constant {RegExp} valid 6-digit hex for URL params. */
  const HEX6 = /^#[0-9a-f]{6}$/i;
  /**
   * Read the current builder state as an object (for URL + debugging).
   * @returns {{n: string, p: string, s: string, bg: string, tx: string, ct: string, r: string, dx: string, dy: string, sh: string, cu: string}} builder values
   */
  function builderState() {
    return {
      n: els.name.value, p: els.primary.value, s: els.secondary.value,
      bg: els.bg.value, tx: els.text.value, ct: els.contrastNum.value,
      r: els.radiusNum.value, dx: els.densXNum.value, dy: els.densYNum.value,
      sh: els.shape.value, cu: els.curveNum.value,
    };
  }
  /**
   * Apply validated URL query params to the builder inputs (shareable links).
   * Invalid values are ignored (never throws).
   * @param {URLSearchParams} q URL query params
   * @returns {boolean} true when at least one value was applied
   */
  function applyUrlState(q) {
    let hit = false;
    const setHex = (el, v) => { if (el && v && HEX6.test(v)) { el.value = v.toLowerCase(); hit = true; } };
    const setNum = (el, v, min, max) => {
      const f = parseFloat(v);
      if (el && Number.isFinite(f)) { el.value = String(clamp(f, min, max)); hit = true; }
    };
    const nm = q.get("n");
    if (nm && els.name) { els.name.value = nm.slice(0, 40); hit = true; }
    setHex(els.primary, q.get("p")); setHex(els.secondary, q.get("s"));
    setHex(els.bg, q.get("bg")); setHex(els.text, q.get("tx"));
    setNum(els.contrastNum, q.get("ct"), 0, 100);
    setNum(els.radiusNum, q.get("r"), 0, 64);
    setNum(els.densXNum, q.get("dx"), 0.5, 2);
    setNum(els.densYNum, q.get("dy"), 0.5, 2);
    const sh = q.get("sh");
    if (sh && els.shape && ["rounded", "sharp", "pill", "squircle"].includes(sh)) { els.shape.value = sh; hit = true; }
    setNum(els.curveNum, q.get("cu"), 0.5, 3);
    return hit;
  }
  let urlTimer = null;
  /**
   * Write builder state to the URL via `history.replaceState` (no reload).
   * @returns {void}
   */
  function pushUrlState() {
    try {
      const q = new URLSearchParams(location.search);
      const s = builderState();
      [["n", s.n], ["p", s.p], ["s", s.s], ["bg", s.bg], ["tx", s.tx], ["ct", s.ct],
       ["r", s.r], ["dx", s.dx], ["dy", s.dy], ["sh", s.sh], ["cu", s.cu]]
        .forEach(([k, v]) => q.set(k, v));
      history.replaceState(null, "", `${location.pathname}?${q}`);
    } catch {}
  }
  /**
   * Debounce URL writes by 300 ms (sliding fires many events).
   * @returns {void}
   */
  function schedulePushUrl() {
    try {
      clearTimeout(urlTimer);
      urlTimer = setTimeout(pushUrlState, 300);
    } catch {}
  }

  // Slider → number field sync
  [[els.radius, els.radiusNum], [els.densX, els.densXNum], [els.densY, els.densYNum], [els.curve, els.curveNum], [els.contrast, els.contrastNum]]
    .forEach(([range, number]) => {
      range?.addEventListener("input", () => {
        if (number) number.value = range.value;
      });
    });

  // Clamp number field to the valid range on leave
  [[els.radiusNum, radiusVal], [els.densXNum, densXVal], [els.densYNum, densYVal], [els.curveNum, curveVal], [els.contrastNum, () => clamp(num(els.contrastNum, 50), 0, 100)]]
    .forEach(([number, get]) => {
      number?.addEventListener("change", () => { number.value = get(); render(); });
    });

  // Only density controls (± numbers) apply on release/leave —
  // they shift the layout under the cursor. Everything else goes live immediately.
  const isDensityCtl = (el) => !!el && !!el.id && el.id.indexOf("in-density") === 0;
  controls.addEventListener("input", (e) => {
    if (e.target && e.target.id !== "in-live-page") dirty = true;
    render(!isDensityCtl(e.target));
  });
  // Release / selection / checkbox → full apply
  controls.addEventListener("change", () => render(true));
  els.livePage?.addEventListener("change", () => { dirty = true; render(); });
  // Theme change top-right → fill builder inputs with theme values
  document.querySelectorAll("[data-lui-theme],[data-lui-mode]").forEach((sel) => {
    sel.addEventListener("change", () => loadThemeIntoBuilder());
  });
  $("btn-reset")?.addEventListener("click", () => {
    loadThemeIntoBuilder();
  });
  // Init: URL state wins (shareable links), otherwise load the active theme into the builder
  let fromUrl = false;
  try {
    fromUrl = applyUrlState(new URLSearchParams(location.search));
  } catch {}
  if (fromUrl) {
    dirty = true;
    render();
  } else {
    loadThemeIntoBuilder();
    window.addEventListener("load", () => { if (!dirty) loadThemeIntoBuilder(); });
  }

  $("btn-copy")?.addEventListener("click", async () => {
    const text = fullFile();
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
    }
  });
  $("btn-share")?.addEventListener("click", async () => {
    try { pushUrlState(); } catch {}
    const url = location.href;
    try { await navigator.clipboard.writeText(url); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = url; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
    }
  });
  $("btn-download")?.addEventListener("click", () => {
    const blob = new Blob([fullFile()], { type: "text/css" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "themes.css";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
})();
