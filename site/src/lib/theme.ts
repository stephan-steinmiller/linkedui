/**
 * linkedui site — theme math ported from the old site/app.js.
 * Pure functions only (no DOM): derivation, export builders, URL state.
 * Live application to the DOM lives in the Builder component.
 */

export interface ThemeInputs {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  bg: string;
  contrastPct: number; // 0..100
  radius: number; // px, 0..64
  densityX: number; // 0.5..2
  densityY: number; // 0.5..2
  shape: 'rounded' | 'sharp' | 'pill' | 'squircle';
  curve: number; // 0.5..3
}

export interface DerivedTheme extends Omit<ThemeInputs, 'densityX' | 'densityY'> {
  box: string;  control: string;
  corner: string;
  baseBox: string;
  baseControl: string;
  compBox: string;
  compControl: string;
  isSquircle: boolean;
  contrast: number;
  contrastRaw: number;
  densityX: string;
  densityY: string;
  text: string;
  accentHover: string;
  accentActive: string;
  accentHoverHex: string;
  accentActiveHex: string;
  accentHoverW: string;
  accentActiveW: string;
  accentHoverWHex: string;
  accentActiveWHex: string;
  onAccent: string;
  hover: string;
  active: string;
  hoverHex: string;
  activeHex: string;
  hoverW: string;
  activeW: string;
  hoverWHex: string;
  activeWHex: string;
  onPrimary: string;
  secondaryHover: string;
  secondaryActive: string;
  secondaryHoverHex: string;
  secondaryActiveHex: string;
  secondaryHoverW: string;
  secondaryActiveW: string;
  secondaryHoverWHex: string;
  secondaryActiveWHex: string;
  onSecondary: string;
  surface: string;
  surfaceHi: string;
  surfaceHex: string;
  muted: string;
  mutedHex: string;
  border: string;
  chevron: string;
  calendar: string;
}

/** Clamp a number to a range. */
export const clamp = (v: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, v));

/** Round to 1 decimal. */
const r1 = (v: number): number => Math.round(v * 10) / 10;

/**
 * Mix two colors in OKLCH (export uses color-mix → no JS needed at runtime).
 * @param a first color (hex)
 * @param b second color (hex or keyword)
 * @param pct share of a in percent
 */
const mix = (a: string, b: string, pct: number): string =>
  `color-mix(in oklch, ${a} ${pct}%, ${b})`;

/** Derive border text share from contrast (0..1) → percent 8..28. */
const borderShare = (ct: number): number => r1(8 + 20 * ct);

/** Surface accent share from contrast → percent 3..11. */
const mixShare = (ct: number): number => r1(3 + 8 * ct);

/** Lightness floor for surface → OKLCH lightness 0.10..0.38. */
const floorVal = (ct: number): number => Math.round((0.1 + 0.28 * ct) * 100) / 100;

/** Surface with lightness floor (modern enhancement line of the export). */
const surfaceHi = (accent: string, bg: string, ct: number): string =>
  `oklch(from ${mix(accent, bg, mixShare(ct))} max(l, ${floorVal(ct).toFixed(2)}) c h)`;

/** Select arrow as SVG data URI in text color. */
const chev = (hex: string): string =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23${(hex || '#333a48').replace('#', '')}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

/** Date-picker calendar glyph as SVG data URI in text color. */
const cal = (hex: string): string =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23${(hex || '#333a48').replace('#', '')}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='4' width='18' height='18' rx='2'/%3E%3Cpath d='M16 2v4M8 2v4M3 10h18'/%3E%3C/svg%3E")`;

/** Relative luminance (WCAG formula) — decides on-primary/on-secondary (light/dark). */
function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return 0;
  const c = [0, 2, 4].map((i) => {
    const v = parseInt(m[1].substr(i, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** WCAG contrast ratio between two hex colors. */
export function contrastRatio(a: string, b: string): number {
  const hi = Math.max(luminance(a), luminance(b));
  const lo = Math.min(luminance(a), luminance(b));
  return (hi + 0.05) / (lo + 0.05);
}

/** Linearly mix two hex colors in sRGB (t = weight toward b). */
function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16),
    pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  const to = (n: number) => clamp(n, 0, 255).toString(16).padStart(2, '0');
  return `#${to(ch(16))}${to(ch(8))}${to(ch(0))}`;
}

/** Normalize a theme name to a valid `data-theme` slug. */
export const slug = (s: string): string =>
  (s || 'my-theme').toLowerCase().trim().replace(/[^a-z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') ||
  'my-theme';

/** Check `corner-shape: superellipse()` support (for radius compensation). */
export const squirSupported = (): boolean =>
  typeof CSS !== 'undefined' && !!CSS.supports && CSS.supports('corner-shape', 'superellipse(1)');

const squirFactor = (k: number): number => 0.5 + 0.5 * k;

export interface ShapeVars {
  box: string;
  control: string;
  corner: string;
  baseBox?: string;
  baseControl?: string;
  compBox?: string;
  compControl?: string;
}

export function shapeVars(shape: ThemeInputs['shape'], radius: number, curve: number): ShapeVars {
  const px = (n: number) => `${r1(Math.max(0, n))}px`;
  if (shape === 'sharp') return { box: '0px', control: '0px', corner: 'round' };
  if (shape === 'pill') return { box: px(radius), control: '999px', corner: 'round' };
  if (shape === 'squircle') {
    const base = px(radius);
    const f = squirFactor(clamp(curve, 0.5, 3));
    const comp = (v: number) => px(v * f);
    return {
      box: base,
      control: base,
      corner: `superellipse(${curve})`,
      baseBox: base,
      baseControl: base,
      compBox: comp(radius),
      compControl: comp(radius)
    };
  }
  return { box: px(radius), control: px(radius), corner: 'round' };
}

/** Derive all theme values from the inputs. */
export function deriveTheme(inp: ThemeInputs): DerivedTheme {
  const ct = clamp(inp.contrastPct, 0, 100) / 100;
  const share = mixShare(ct);
  const sv = shapeVars(inp.shape, clamp(inp.radius, 0, 64), clamp(inp.curve, 0.5, 3));
  const { box, control, corner } = sv;
  const { primary, secondary, bg } = inp;
  const accent = inp.accent || primary;
  // Text derives from the background: dark on light bg, light on dark bg.
  const text = luminance(bg) > 0.45 ? '#333a48' : '#f2f3f5';
  return {
    ...inp,
    radius: inp.radius,
    box,
    control,
    corner,
    baseBox: sv.baseBox || box,
    baseControl: sv.baseControl || control,
    compBox: sv.compBox || box,
    compControl: sv.compControl || control,
    isSquircle: inp.shape === 'squircle',
    contrast: Math.round(ct * 100),
    contrastRaw: Math.round(ct * 100) / 100,
    densityX: clamp(inp.densityX, 0.5, 2).toFixed(2),
    densityY: clamp(inp.densityY, 0.5, 2).toFixed(2),
    text,
    accent,
    accentHover: mix(accent, 'black', 88),
    accentActive: mix(accent, 'black', 78),
    accentHoverHex: mixHex(accent, '#000000', 0.12),
    accentActiveHex: mixHex(accent, '#000000', 0.22),
    accentHoverW: mix(accent, 'white', 88),
    accentActiveW: mix(accent, 'white', 78),
    accentHoverWHex: mixHex(accent, '#ffffff', 0.12),
    accentActiveWHex: mixHex(accent, '#ffffff', 0.22),
    onAccent: luminance(accent) > 0.45 ? '#1c2333' : '#ffffff',
    hover: mix(primary, 'black', 88),
    active: mix(primary, 'black', 78),
    hoverHex: mixHex(primary, '#000000', 0.12),
    activeHex: mixHex(primary, '#000000', 0.22),
    hoverW: mix(primary, 'white', 88),
    activeW: mix(primary, 'white', 78),
    hoverWHex: mixHex(primary, '#ffffff', 0.12),
    activeWHex: mixHex(primary, '#ffffff', 0.22),
    onPrimary: luminance(primary) > 0.45 ? '#1c2333' : '#ffffff',
    secondaryHover: mix(secondary, 'black', 88),
    secondaryActive: mix(secondary, 'black', 78),
    secondaryHoverHex: mixHex(secondary, '#000000', 0.12),
    secondaryActiveHex: mixHex(secondary, '#000000', 0.22),
    secondaryHoverW: mix(secondary, 'white', 88),
    secondaryActiveW: mix(secondary, 'white', 78),
    secondaryHoverWHex: mixHex(secondary, '#ffffff', 0.12),
    secondaryActiveWHex: mixHex(secondary, '#ffffff', 0.22),
    onSecondary: luminance(secondary) > 0.45 ? '#1c2333' : '#ffffff',
    surface: mix(accent, bg, share),
    surfaceHi: surfaceHi(accent, bg, ct),
    surfaceHex: mixHex(accent, bg, 1 - share / 100),
    muted: mix(text, bg, 62),
    mutedHex: mixHex(text, bg, 0.38),
    border: mix(text, bg, borderShare(ct)),
    chevron: chev(text),
    calendar: cal(text)
  };
}

/** Build the export snippet for `themes.css` (`[data-theme="<slug>"]`). */
export function themeSnippet(name: string, d: DerivedTheme): string {
  const slugName = slug(name);
  let out =
    `[data-theme="${slugName}"] {\n` +
    `  --lui-primary: ${d.primary};\n` +
    `  --lui-primary-hover: ${d.hoverHex};\n` +
    `  --lui-primary-hover: ${d.hover};\n` +
    `  --lui-primary-active: ${d.activeHex};\n` +
    `  --lui-primary-active: ${d.active};\n` +
    `  --lui-on-primary: ${d.onPrimary};\n` +
    `  --lui-secondary: ${d.secondary};\n` +
    `  --lui-secondary-hover: ${d.secondaryHoverHex};\n` +
    `  --lui-secondary-hover: ${d.secondaryHover};\n` +
    `  --lui-secondary-active: ${d.secondaryActiveHex};\n` +
    `  --lui-secondary-active: ${d.secondaryActive};\n` +
    `  --lui-on-secondary: ${d.onSecondary};\n` +
    `  --lui-accent: ${d.accent};\n` +
    `  --lui-accent-hover: ${d.accentHoverHex};\n` +
    `  --lui-accent-hover: ${d.accentHover};\n` +
    `  --lui-accent-active: ${d.accentActiveHex};\n` +
    `  --lui-accent-active: ${d.accentActive};\n` +
    `  --lui-on-accent: ${d.onAccent};\n` +
    `  --lui-bg: ${d.bg};\n` +
    `  --lui-surface: ${d.surface};\n` +
    `  --lui-surface: ${d.surfaceHi};\n` +
    `  --lui-text: ${d.text};\n` +
    `  --lui-muted: ${d.muted};\n` +
    `  --lui-border: ${d.border};\n` +
    `  --lui-chevron: ${d.chevron};\n` +
    `  --lui-calendar: ${d.calendar};\n` +
    `  --lui-contrast: ${d.contrastRaw.toFixed(2)};\n` +
    `  --lui-radius: ${d.baseBox};\n` +
    `  --lui-radius-control: ${d.baseControl};\n` +
    `  --lui-density-x: ${d.densityX};\n` +
    `  --lui-density-y: ${d.densityY};\n` +
    `  --lui-corner-shape: ${d.corner};\n` +
    `}`;
  // Compensated radius only inside @supports — base radius applies without shape support.
  if (d.isSquircle && d.compBox !== d.baseBox) {
    const k = clamp(d.curve || 1.3, 0.5, 3);
    out +=
      `\n/* Radius compensation for superellipse (only where supported): ${d.baseBox} × ${(0.5 + 0.5 * k).toFixed(2)} */\n` +
      `@supports (corner-shape: superellipse(1)) {\n` +
      `  [data-theme="${slugName}"] {\n` +
      `    --lui-radius: ${d.compBox};\n` +
      `    --lui-radius-control: ${d.compControl};\n` +
      `  }\n}`;
  }
  return out;
}

/** Build the complete theme file (light block + dark override + system auto). */
export function fullFile(name: string, d: DerivedTheme): string {
  const slugName = slug(name);
  const light = themeSnippet(name, d);
  // NOTE: status tones, shadows and danger keep the lib :root defaults
  // (not builder inputs) — override them per theme when they must adapt.
  const darkBlock = (mode: string): string =>
    `[data-mode="${mode}"][data-theme="${slugName}"] {\n` +
    `  color-scheme: dark;\n` +
    `  --lui-primary: ${d.primary};\n` +
    `  --lui-primary-hover: ${d.hoverWHex};\n` +
    `  --lui-primary-hover: ${d.hoverW};\n` +
    `  --lui-primary-active: ${d.activeWHex};\n` +
    `  --lui-primary-active: ${d.activeW};\n` +
    `  --lui-on-primary: ${d.onPrimary};\n` +
    `  --lui-secondary: ${d.secondary};\n` +
    `  --lui-secondary-hover: ${d.secondaryHoverWHex};\n` +
    `  --lui-secondary-hover: ${d.secondaryHoverW};\n` +
    `  --lui-secondary-active: ${d.secondaryActiveWHex};\n` +
    `  --lui-secondary-active: ${d.secondaryActiveW};\n` +
    `  --lui-on-secondary: ${d.onSecondary};\n` +
    `  --lui-accent: ${d.accent};\n` +
    `  --lui-accent-hover: ${d.accentHoverWHex};\n` +
    `  --lui-accent-hover: ${d.accentHoverW};\n` +
    `  --lui-accent-active: ${d.accentActiveWHex};\n` +
    `  --lui-accent-active: ${d.accentActiveW};\n` +
    `  --lui-on-accent: ${d.onAccent};\n` +
    `  --lui-bg: #161b28;\n` +
    `  --lui-surface: #252a36;\n` +
    `  --lui-surface: ${surfaceHi(d.accent, '#161b28', d.contrastRaw)};\n` +
    `  --lui-text: #f2f3f5;\n` +
    `  --lui-muted: #9aa3b5;\n` +
    `  --lui-border: #3a4152;\n` +
    `  --lui-border: color-mix(in oklch, #f2f3f5 calc(8% + ${d.contrastRaw.toFixed(2)} * 20%), #161b28);\n` +
    `  --lui-chevron: ${chev('#e8eaf0')};\n` +
    `  --lui-calendar: ${cal('#e8eaf0')};\n` +
    `}`;
  const dark =
    `${darkBlock('dark')}\n@media (prefers-color-scheme: dark) {\n  ${darkBlock('auto').replace(/\n/g, '\n  ')}\n}`;
  return `/* linkedui theme: ${slugName} — paste into themes.css */\n${light}\n${dark}\n`;
}

/** Contrast check for text/fill pairs (AA 4.5). Returns failing descriptions. */
export function contrastWarnings(d: DerivedTheme): string[] {
  const bad: string[] = [];
  const check = (label: string, fg: string, bgr: string): void => {
    const r = contrastRatio(fg, bgr);
    if (r < 4.5) bad.push(`${label} ${r.toFixed(1)}`);
  };
  check('primary', d.primary, d.onPrimary);
  check('secondary', d.secondary, d.onSecondary);
  check('accent', d.accent, d.onAccent);
  check('muted/surface', d.mutedHex, d.surfaceHex);
  return bad;
}

/** Valid 6-digit hex for URL params. */
const HEX6 = /^#[0-9a-f]{6}$/i;

export interface BuilderState {
  n: string;
  p: string;
  s: string;
  a: string;
  bg: string;
  ct: string;
  r: string;
  dx: string;
  dy: string;
  sh: string;
  cu: string;
}

/** Apply validated URL query params to a builder state object. */
export function applyUrlState(
  q: URLSearchParams,
  cur: BuilderState
): { state: BuilderState; hit: boolean } {
  const state = { ...cur };
  let hit = false;
  const setHex = (k: 'p' | 's' | 'a' | 'bg', v: string | null): void => {
    if (v && HEX6.test(v)) {
      state[k] = v.toLowerCase();
      hit = true;
    }
  };
  const setNum = (k: 'ct' | 'r' | 'dx' | 'dy' | 'cu', v: string | null, min: number, max: number): void => {
    const f = parseFloat(v ?? '');
    if (Number.isFinite(f)) {
      state[k] = String(clamp(f, min, max));
      hit = true;
    }
  };
  const nm = q.get('n');
  if (nm) {
    state.n = nm.slice(0, 40);
    hit = true;
  }
  setHex('p', q.get('p'));
  setHex('s', q.get('s'));
  setHex('a', q.get('a'));
  setHex('bg', q.get('bg'));
  setNum('ct', q.get('ct'), 0, 100);
  setNum('r', q.get('r'), 0, 64);
  setNum('dx', q.get('dx'), 0.5, 2);
  setNum('dy', q.get('dy'), 0.5, 2);
  const sh = q.get('sh');
  if (sh && ['rounded', 'sharp', 'pill', 'squircle'].includes(sh)) {
    state.sh = sh;
    hit = true;
  }
  setNum('cu', q.get('cu'), 0.5, 3);
  return { state, hit };
}

/** Serialize builder state to a query string (share/reload-safe). */
export function stateToQuery(s: BuilderState): string {
  const q = new URLSearchParams();
  (
    [
      ['n', s.n],
      ['p', s.p],
      ['s', s.s],
      ['a', s.a],
      ['bg', s.bg],
      ['ct', s.ct],
      ['r', s.r],
      ['dx', s.dx],
      ['dy', s.dy],
      ['sh', s.sh],
      ['cu', s.cu]
    ] as const
  ).forEach(([k, v]) => q.set(k, v));
  return q.toString();
}
