<script lang="ts">
  import { onMount, tick } from 'svelte';
  import {
    clamp,
    deriveTheme,
    fullFile,
    contrastWarnings,
    applyUrlState,
    stateToQuery,
    squirSupported
  } from '$lib/theme';
  import type { SiteStrings as Strings } from '$lib/i18n';

  let { t, children }: { t: Strings; children?: import('svelte').Snippet } = $props();

  // ---- state (mirrors the old builder form fields) ----
  // Seeded once from the initial locale on purpose: the name is then user-editable.
  // svelte-ignore state_referenced_locally
  let name = $state(t.defaultName);
  let primary = $state('#2272ce');
  let secondary = $state('#5d7295');
  let accent = $state('#2272ce');
  let bg = $state('#161b28');
  let contrast = $state(50);
  let radius = $state(12);
  let dx = $state(1);
  let dy = $state(0.75);
  let shape: string = $state('rounded');
  let curve = $state(1.3);
  let livePage = $state(true);
  let dirty = $state(false);
  // Density applies on release only (layout must not shift under the cursor).
  let dxApplied = $state(1);
  let dyApplied = $state(0.75);

  let previewEl: HTMLElement | null = $state(null);

  const MANAGED = [
    'color-scheme', '--lui-primary', '--lui-primary-hover', '--lui-primary-active',
    '--lui-on-primary', '--lui-secondary', '--lui-secondary-hover', '--lui-secondary-active',
    '--lui-on-secondary', '--lui-accent', '--lui-accent-hover', '--lui-accent-active',
    '--lui-on-accent', '--lui-bg', '--lui-surface', '--lui-text', '--lui-muted',
    '--lui-border', '--lui-chevron', '--lui-calendar', '--lui-contrast', '--lui-radius', '--lui-radius-control',
    '--lui-density-x', '--lui-density-y', '--lui-corner-shape'
  ];

  function applyVars(el: HTMLElement, d: ReturnType<typeof deriveTheme>): void {
    el.style.color = d.text;
    el.style.setProperty('color-scheme', luminanceOf(d.bg) > 0.45 ? 'light' : 'dark');
    el.style.setProperty('--lui-primary', d.primary);
    el.style.setProperty('--lui-primary-hover', d.hover);
    el.style.setProperty('--lui-primary-active', d.active);
    el.style.setProperty('--lui-on-primary', d.onPrimary);
    el.style.setProperty('--lui-secondary', d.secondary);
    el.style.setProperty('--lui-secondary-hover', d.secondaryHover);
    el.style.setProperty('--lui-secondary-active', d.secondaryActive);
    el.style.setProperty('--lui-on-secondary', d.onSecondary);
    el.style.setProperty('--lui-accent', d.accent);
    el.style.setProperty('--lui-accent-hover', d.accentHover);
    el.style.setProperty('--lui-accent-active', d.accentActive);
    el.style.setProperty('--lui-on-accent', d.onAccent);
    el.style.setProperty('--lui-bg', d.bg);
    el.style.setProperty('--lui-surface', d.surfaceHi);
    el.style.setProperty('--lui-text', d.text);
    el.style.setProperty('--lui-muted', d.muted);
    el.style.setProperty('--lui-border', d.border);
    el.style.setProperty('--lui-chevron', d.chevron);
    el.style.setProperty('--lui-calendar', d.calendar);
    el.style.setProperty('--lui-contrast', String(d.contrastRaw));
    el.style.setProperty('--lui-radius', d.baseBox);
    el.style.setProperty('--lui-radius-control', d.baseControl);
    el.style.setProperty('--lui-density-x', d.densityX);
    el.style.setProperty('--lui-density-y', d.densityY);
    el.style.setProperty('--lui-corner-shape', d.corner);
  }

  function luminanceOf(hex: string): number {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return 0;
    const c = [0, 2, 4].map((i) => {
      const v = parseInt(m[1].substr(i, 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  function clearVars(el: HTMLElement): void {
    MANAGED.forEach((p) => el.style.removeProperty(p));
    el.style.removeProperty('color');
  }

  // ---- derived theme (outputs follow drafts, like the old render(false)) ----
  let d = $derived(
    deriveTheme({
      name,
      primary,
      secondary,
      accent,
      bg,
      contrastPct: contrast,
      radius,
      densityX: dx,
      densityY: dy,
      shape: shape as 'rounded' | 'sharp' | 'pill' | 'squircle',
      curve
    })
  );
  let warnings = $derived(contrastWarnings(d));
  let exportText = $derived(fullFile(name, d));

  let outRadius = $derived(
    shape === 'pill'
      ? `${d.baseBox} / pill`
      : d.isSquircle && d.box !== d.baseBox
        ? `${d.baseBox} → ${d.box}`
        : d.baseBox
  );

  // ---- side effects: apply vars + URL ----
  let urlTimer: ReturnType<typeof setTimeout> | null = null;
  function pushUrl(): void {
    // Plain replaceState, not SvelteKit goto(): the query string is only
    // shareable state — it must never trigger a navigation (goto() reloads
    // the page when served from a non-canonical URL like /index.html or a
    // subpath, wiping slider state mid-drag).
    try {
      const q = stateToQuery({ n: name, p: primary, s: secondary, a: accent, bg, ct: String(contrast), r: String(radius), dx: String(dx), dy: String(dy), sh: shape, cu: String(curve) });
      history.replaceState(null, '', `?${q}`);
    } catch {
      /* ignore (e.g. prerender) */
    }
  }
  function schedulePushUrl(): void {
    try {
      if (urlTimer) clearTimeout(urlTimer);
      urlTimer = setTimeout(pushUrl, 300);
    } catch {
      /* ignore */
    }
  }

  $effect(() => {
    // Runs on every state change (outputs are derived, this handles DOM + URL).
    void d;
    if (!previewEl) return;
    if (dirty) {
      const applied = { ...d, densityX: dxApplied.toFixed(2), densityY: dyApplied.toFixed(2) };
      applyVars(previewEl, applied as typeof d);
    } else {
      clearVars(previewEl);
    }
    if (dirty && livePage) {
      applyVars(document.documentElement, { ...d, densityX: dxApplied.toFixed(2), densityY: dyApplied.toFixed(2) } as typeof d);
    } else {
      clearVars(document.documentElement);
    }
    schedulePushUrl();
  });

  function markDirty(): void {
    dirty = true;
  }

  // Re-highlight the export after each change. enhance.js replaces the
  // <code> innerHTML with line spans, detaching Svelte's text node — so
  // this effect (not the template binding) is the sole writer: it sets the
  // raw text fresh, then re-highlights. No-op until enhance.js loads.
  $effect(() => {
    const t = exportText;
    tick().then(() => {
      try {
        const code = document.getElementById('lui-export');
        if (!code) return;
        if (code.textContent !== t) code.textContent = t;
        code.removeAttribute('data-lui-hl');
        (window as unknown as { luiHighlight?: () => void }).luiHighlight?.();
      } catch {
        /* ignore */
      }
    });
  });

  function commitDensity(): void {
    dx = clamp(dx, 0.5, 2);
    dy = clamp(dy, 0.5, 2);
    dxApplied = dx;
    dyApplied = dy;
    dirty = true;
  }

  function clampNum(v: number, fb: number, min: number, max: number): number {
    return Number.isFinite(v) ? clamp(v, min, max) : fb;
  }

  let cssCv: CanvasRenderingContext2D | null = null;
  function cssToHex(css: string): string | null {
    try {
      cssCv = cssCv || document.createElement('canvas').getContext('2d');
      if (!cssCv) return null;
      cssCv.fillStyle = '#000000';
      cssCv.fillStyle = (css || '').trim().toLowerCase();
      const v = String(cssCv.fillStyle);
      const hex = /^#([0-9a-f]{6})$/i.exec(v);
      if (hex) return `#${hex[1].toLowerCase()}`;
      const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(v);
      if (!rgb) return null;
      const to = (n: string) => clamp(Math.round(Number(n)), 0, 255).toString(16).padStart(2, '0');
      return `#${to(rgb[1])}${to(rgb[2])}${to(rgb[3])}`;
    } catch {
      return null;
    }
  }

  /** Load the active theme (chosen top-right) into the builder inputs. */
  function loadThemeIntoBuilder(): void {
    let cs: CSSStyleDeclaration | null = null;
    try {
      cs = getComputedStyle(document.documentElement);
    } catch {
      return;
    }
    if (!cs) return;
    const get = (n: string): string => (cs as CSSStyleDeclaration).getPropertyValue(n) || ''.trim();
    const set = (v: string | null, apply: (x: string) => void): void => {
      if (v !== null && v !== undefined && v !== '') apply(v);
    };
    set(cssToHex(get('--lui-primary')), (v) => (primary = v));
    set(cssToHex(get('--lui-secondary')), (v) => (secondary = v));
    set(cssToHex(get('--lui-accent')), (v) => (accent = v));
    set(cssToHex(get('--lui-bg')), (v) => (bg = v));
    const corner = get('--lui-corner-shape');
    const sm = /superellipse\(\s*([0-9.]+)\s*\)/.exec(corner || '');
    const control = get('--lui-radius-control');
    const baseR = parseFloat(get('--lui-radius'));
    if (sm) {
      shape = 'squircle';
      const k = parseFloat(sm[1]) || 1.3;
      curve = !Number.isFinite(baseR) ? 1.3 : squirSupported() ? Math.round((baseR / (0.5 + 0.5 * k)) * 10) / 10 : Math.round(baseR);
      if (Number.isFinite(baseR)) radius = Math.round(squirSupported() ? baseR / (0.5 + 0.5 * k) : baseR);
    } else if (control === '999px') {
      shape = 'pill';
      if (Number.isFinite(baseR)) radius = Math.round(baseR);
    } else if (control === '0px' || baseR === 0) {
      shape = 'sharp';
    } else {
      shape = 'rounded';
      if (Number.isFinite(baseR)) radius = Math.round(baseR);
    }
    const ddx = parseFloat(get('--lui-density-x')),
      ddy = parseFloat(get('--lui-density-y'));
    if (Number.isFinite(ddx)) {
      dx = ddx;
      dxApplied = ddx;
    }
    if (Number.isFinite(ddy)) {
      dy = ddy;
      dyApplied = ddy;
    }
    const ct = parseFloat(get('--lui-contrast'));
    if (Number.isFinite(ct)) contrast = Math.round(clamp(ct, 0, 1) * 100);
    dirty = false;
  }

  async function copyText(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {
        /* ignore */
      }
      ta.remove();
    }
  }

  onMount(() => {
    // Init: URL state wins (shareable links), otherwise load the active theme.
    let fromUrl = false;
    try {
      const { state, hit } = applyUrlState(new URLSearchParams(location.search), {
        n: name, p: primary, s: secondary, a: accent, bg,
        ct: String(contrast), r: String(radius), dx: String(dx), dy: String(dy), sh: shape, cu: String(curve)
      });
      if (hit) {
        name = state.n;
        primary = state.p;
        secondary = state.s;
        accent = state.a;
        bg = state.bg;
        contrast = Number(state.ct);
        radius = Number(state.r);
        dx = dxApplied = Number(state.dx);
        dy = dyApplied = Number(state.dy);
        shape = state.sh;
        curve = Number(state.cu);
        fromUrl = true;
      }
    } catch {
      /* ignore */
    }
    if (fromUrl) {
      dirty = true;
    } else {
      loadThemeIntoBuilder();
      const onLoad = (): void => {
        try {
          if (!dirty) loadThemeIntoBuilder();
        } catch {
          /* ignore */
        }
      };
      window.addEventListener('load', onLoad);
      return () => window.removeEventListener('load', onLoad);
    }
    // Theme change top-right → fill builder inputs with theme values.
    const onTheme = (): void => loadThemeIntoBuilder();
    document.querySelectorAll('[data-lui-theme],[data-lui-mode]').forEach((sel) => {
      sel.addEventListener('change', onTheme);
    });
  });
</script>

<div class="builder">
  <form
    class="panel controls"
    id="controls"
    method="get"
    action="#export"
    onsubmit={(e) => e.preventDefault()}
  >
    <label
      >{t.nameLabel}
      <input name="name" id="in-name" value={name} maxlength={40} oninput={(e) => { name = e.currentTarget.value; markDirty(); }} /></label
    >
    <label
      >{t.primaryLabel}
      <input type="color" id="in-primary" value={primary} oninput={(e) => { primary = e.currentTarget.value; markDirty(); }} /></label
    >
    <label
      >{t.secondaryLabel}
      <input type="color" id="in-secondary" value={secondary} oninput={(e) => { secondary = e.currentTarget.value; markDirty(); }} /></label
    >
    <label
      >{t.accentLabel}
      <input type="color" id="in-accent" value={accent} oninput={(e) => { accent = e.currentTarget.value; markDirty(); }} /></label
    >
    <label
      >{t.bgLabel}
      <input type="color" id="in-bg" value={bg} oninput={(e) => { bg = e.currentTarget.value; markDirty(); }} /></label
    >
    <p class="hint" id="out-warn" role="status" hidden={warnings.length === 0}>{t.warnText(warnings)}</p>
    <label
      >{t.contrastLabel} <output id="out-contrast" for="in-contrast">{contrast}%</output>
      <span class="pair">
        <input
          type="range"
          id="in-contrast"
          min="0"
          max="100"
          step="1"
          value={contrast}
          oninput={(e) => { contrast = Number(e.currentTarget.value); markDirty(); }}
        />
        <input
          type="number"
          id="in-contrast-num"
          min="0"
          max="100"
          step="1"
          value={contrast}
          aria-label={t.contrastAria}
          onchange={(e) => { contrast = clampNum(Number(e.currentTarget.value), 50, 0, 100); markDirty(); }}
        />
      </span>
    </label>
    <label
      >{t.radiusLabel} <output id="out-radius" for="in-radius">{radius}px</output>
      <span class="pair">
        <input
          type="range"
          id="in-radius"
          min="0"
          max="24"
          step="0.5"
          value={radius}
          oninput={(e) => { radius = Number(e.currentTarget.value); markDirty(); }}
        />
        <input
          type="number"
          id="in-radius-num"
          min="0"
          max="64"
          step="0.5"
          value={radius}
          aria-label={t.radiusAria}
          onchange={(e) => { radius = clampNum(Number(e.currentTarget.value), 12, 0, 64); markDirty(); }}
        />
      </span>
    </label>
    <label
      >{t.densYLabel} <output id="out-density-y" for="in-density-y">{dy}</output>
      <span class="pair">
        <input
          type="range"
          id="in-density-y"
          min="0.5"
          max="2"
          step="0.01"
          value={dy}
          oninput={(e) => { dy = Number(e.currentTarget.value); markDirty(); }}
          onchange={() => commitDensity()}
        />
        <input
          type="number"
          id="in-density-y-num"
          min="0.5"
          max="2"
          step="0.01"
          value={dy}
          aria-label={t.densYAria}
          onchange={(e) => { dy = Number(e.currentTarget.value); commitDensity(); }}
        />
      </span>
    </label>
    <label
      >{t.densXLabel} <output id="out-density-x" for="in-density-x">{dx}</output>
      <span class="pair">
        <input
          type="range"
          id="in-density-x"
          min="0.5"
          max="2"
          step="0.01"
          value={dx}
          oninput={(e) => { dx = Number(e.currentTarget.value); markDirty(); }}
          onchange={() => commitDensity()}
        />
        <input
          type="number"
          id="in-density-x-num"
          min="0.5"
          max="2"
          step="0.01"
          value={dx}
          aria-label={t.densXAria}
          onchange={(e) => { dx = Number(e.currentTarget.value); commitDensity(); }}
        />
      </span>
    </label>
    <label
      >{t.shapeLabel}
      <select id="in-shape" value={shape} onchange={(e) => { shape = e.currentTarget.value; markDirty(); }}>
        <option value="rounded">{t.shapeRounded}</option>
        <option value="sharp">{t.shapeSharp}</option>
        <option value="pill">{t.shapePill}</option>
        <option value="squircle">{t.shapeSquircle}</option>
      </select>
    </label>
    <label
      >{t.curveLabel} <output id="out-curve" for="in-curve">{curve}</output>
      <span class="pair">
        <input
          type="range"
          id="in-curve"
          min="0.8"
          max="2"
          step="0.1"
          value={curve}
          disabled={shape !== 'squircle'}
          oninput={(e) => { curve = Number(e.currentTarget.value); markDirty(); }}
        />
        <input
          type="number"
          id="in-curve-num"
          min="0.5"
          max="3"
          step="0.1"
          value={curve}
          disabled={shape !== 'squircle'}
          aria-label={t.curveAria}
          onchange={(e) => { curve = clampNum(Number(e.currentTarget.value), 1.3, 0.5, 3); markDirty(); }}
        />
      </span>
    </label>
    <label style="display:flex;gap:.5rem;align-items:center;font-weight:600">
      <input
        type="checkbox"
        id="in-live-page"
        checked={livePage}
        onchange={(e) => { livePage = e.currentTarget.checked; dirty = true; }}
      />
      {t.livePageLabel}
    </label>
    <div class="cluster">
      <button class="btn" data-variant="secondary" type="button" id="btn-reset" onclick={() => loadThemeIntoBuilder()}
        >{t.resetBtn}</button
      >
    </div>
  </form>

  <div class="preview" id="preview" aria-label={t.previewAria} bind:this={previewEl}>
    {@render children?.()}
  </div>
</div>

<h3 id="export">{t.exportH}</h3>
<div class="cluster">
  <button class="btn" id="btn-copy" type="button" data-variant="secondary" onclick={() => copyText(exportText)}
    >{t.copyBtn}</button
  >
  <button
    class="btn"
    id="btn-download"
    type="button"
    data-variant="secondary"
    onclick={() => {
      const blob = new Blob([exportText], { type: 'text/css' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'themes.css';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }}>{t.downloadBtn}</button
  >
  <button
    class="btn"
    id="btn-share"
    type="button"
    data-variant="secondary"
    onclick={async () => {
      pushUrl();
      await copyText(location.href);
    }}>{t.shareBtn}</button
  >
</div>
<figure class="code-block" data-lang="css">
  <figcaption><span>themes.css</span></figcaption>
  <pre><code id="lui-export">{exportText}</code></pre>
</figure>
