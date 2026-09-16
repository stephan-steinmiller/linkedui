# linkedui Wiki

CSS-first UI library: classless base, variants via classes, theming via CSS variables.
Usable without JS, better with JS (progressive enhancement). No build, no dependencies.

- **Live docs (built with the lib itself):** `site/wiki.html` (English), `site/wiki-de.html` (Deutsch)
- **Theme builder:** `site/index.html` (English), `site/index-de.html` (Deutsch)
- **Entry point:** `src/linkedui.css`

## 1. Quick start

```html
<link rel="stylesheet" href="linkedui/src/linkedui.css" />
<html data-theme="default" data-mode="auto">
<body>
  <main class="lui-container">
    <button class="btn">Primary</button>
  </main>
  <script src="linkedui/src/enhance.js" defer></script>
</body>
```

Optional anti-FOUC snippet (theme before first paint, in addition to `enhance.js`):

```html
<script>
try {
  const t = localStorage.getItem("lui-theme"), m = localStorage.getItem("lui-mode");
  if (t) document.documentElement.dataset.theme = t;
  if (m) document.documentElement.dataset.mode = m;
} catch (e) {}
</script>
```

## 2. Principles

1. **Classless first:** semantic HTML (`button`, `input`, `table`, `article`, `details` …)
   looks good without a single class (`src/base.css`).
2. **Variants via attributes:** `.btn` + `data-variant`, `data-size`, etc. (`src/components/`).
3. **Everything is a token:** colors, radii, densities, heights — all `--lui-*` (`src/tokens.css`).
4. **System theme by default:** `data-mode="auto"` follows `prefers-color-scheme`, pure CSS.
5. **CSS only where it's clean:** hacks (checkbox hack etc.) are replaced with mini JS.

## 3. Components (markup reference)

### Buttons — `src/components/button.css`

```html
<button class="btn">Primary</button>
<button class="btn" data-variant="secondary">Secondary</button>
<button class="btn" data-variant="ghost">Ghost</button>
<button class="btn" data-variant="outline">Outline</button>
<button class="btn" data-variant="danger">Delete</button><!-- alias: destructive -->
<button class="btn" data-size="sm">Small</button><!-- sm | (md) | lg -->
<button class="btn" data-block="true">Full width</button>
<button class="btn" data-icon="true" aria-label="Search">⌕</button>
<button class="btn" data-loading="true">Loading…</button><!-- spinner, pure CSS -->
<button class="btn" disabled>Disabled</button><!-- or aria-disabled="true" -->
<a class="btn" href="/start">As a link</a>
```

### Forms — classless (`src/base.css`)

```html
<label class="field"><span>Name</span><input placeholder="…" /></label>
<select><option>…</option></select><!-- custom chevron, follows the theme -->
<textarea></textarea>
<input type="checkbox" checked /> <input type="radio" name="g" checked />
<label class="switch">
  <input type="checkbox" role="switch" checked /><span aria-hidden="true"></span> Wi-Fi
</label>
<input type="range" min="0" max="100" value="60" />
<input type="color" value="#4f7dd9" />
```

Single-line controls (button, input, select) share exactly one height
(`--lui-control-h-md`). Checkbox/radio are control-S sized.

### Cards, layout — `src/components/card.css`

```html
<main class="lui-container">
  <div class="lui-grid">
    <article class="card"><h3>Title</h3><p>Text</p></article>
  </div>
</main>
```

Bare `<article>` without class already looks like `.card`.

### Feedback — `src/components/feedback.css`

```html
<div class="alert" data-tone="success"><span>Done!</span></div>
<!-- data-tone: success | warning | danger (none: neutral) -->
<span class="badge">New</span>
```

### Nav, tooltip, dropdown, toast — `src/components/nav-overlays.css`

```html
<nav class="nav">
  <strong>Logo</strong>
  <a href="/" aria-current="page">Active</a>
</nav>
<span data-tooltip="Pure CSS">Hover me</span>
<details class="dropdown">
  <summary>Menu</summary>
  <div><a href="…">Entry</a></div>
</details>
```

### Segmented control — `src/components/segmented.css`

Pill switcher (e.g. 1D/7D/1M or Chats/Emails). Radio-based, no JS needed
(native radiogroup: Tab + arrows work). Unlike `.tabs` there are no panels —
it only selects a value.

```html
<div class="segmented" role="group" aria-label="Time range">
  <input type="radio" name="range" id="r-7d" checked /><label for="r-7d">7D</label>
  <input type="radio" name="range" id="r-1m" /><label for="r-1m">1M</label>
</div>
```

### Field hints — `src/components/card.css` (`.field`)

Help or validation text under the control, linked via `aria-describedby`.
Invalid: `data-invalid="true"` on the `.field` (or `aria-invalid="true"`
directly on the control) turns border + hint danger-colored.

```html
<label class="field" data-invalid="true">
  <span>Email</span><input aria-describedby="e-hint" />
  <small class="hint" id="e-hint">Enter a valid email.</small>
</label>
```

### Toasts — `src/components/nav-overlays.css` + `enhance.js`

Tinted cards (info | success | warning | danger) with icon, title, message.
Static in flow, or live stacked bottom-right via the `.toasts` container.
No-JS: static markup only. With JS: `showToast()` (auto-dismiss, close
button) or declarative triggers — also exposed as `window.luiToast`.

```html
<div class="toast" data-tone="success" role="status">
  <div><strong>Changes saved</strong><p>Profile updated.</p></div>
  <button type="button" data-lui-toast-close aria-label="Dismiss">×</button>
</div>
<button data-lui-toast="info" data-lui-toast-title="Hi" data-lui-toast-message="Hello.">Show toast</button>
<script>luiToast({ tone: "danger", title: "Build failed", message: "3 tests red.", ms: 5000 });</script>
```

### Tabs — `src/components/tabs.css`

Order per tab matters: `input → label → section` as direct children.
Without JS: native radio group (Tab + arrow keys work natively).
With JS: `tablist` roles, roving tabindex, Home/End.

```html
<div class="tabs">
  <input type="radio" name="t" id="t1" checked />
  <label for="t1">Overview</label>
  <section><p>Panel 1</p></section>
  <input type="radio" name="t" id="t2" />
  <label for="t2">Details</label>
  <section><p>Panel 2</p></section>
</div>
```

### OTP — `src/components/otp.css`

Separate boxes with per-box focus ring. JS (`enhanceOtp` in `enhance.js`)
handles auto-advance, backspace-to-previous, arrows/Home/End and paste-split
across boxes starting at the focused box — pasting a whole code never lands on
one digit. Overflow typed or autofilled into a single box is distributed forward.
Without JS: type one digit per box, Tab advances.

```html
<div class="otp" role="group" aria-label="One-time code, 6 digits">
  <input inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" aria-label="Digit 1 of 6" />
  <!-- … more inputs, optional <span aria-hidden="true">–</span> dash … -->
</div>
```

### Dialog — native + `enhance.js`

```html
<button data-lui-open="info">Open</button>
<dialog id="info">
  <h3>Title</h3>
  <button data-lui-close>Close</button>
</dialog>
```

ESC + backdrop click included. Without JS: set the `open` attribute.

### Tables, details, code — classless

```html
<table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Ada</td></tr></tbody></table>
<details><summary>More</summary><p>Content</p></details>
```

## 4. Theming

```html
<html data-theme="default" data-mode="auto">
```

| `data-theme` | `data-mode` |
|---|---|
| `default` · `ocean` · `squishy` · custom | `auto` (system, default) · `light` · `dark` (override) |

Theme switcher (persistent + reload-free with JS, plain form without JS):

```html
<select data-lui-theme>
  <option value="default">default</option>
  <option value="ocean">ocean</option>
  <option value="squishy">squishy</option>
</select>
<select data-lui-mode>
  <option value="auto">auto (system)</option>
  <option value="light">light</option>
  <option value="dark">dark</option>
</select>
```

### Custom themes

Pattern in `src/themes.css` (header comment), easiest via the builder
(`site/index.html`): colors → radius/density/shape → copy the export or
download `themes.css`. Shape rules: `--lui-radius` = boxes,
`--lui-radius-control` = controls (`999px` = pill for controls only),
`--lui-corner-shape: round | superellipse(K)`. Compensate squircle radius
(`base × (0.5 + 0.5 × K)`) **only** inside
`@supports (corner-shape: superellipse(1))` — otherwise it gets too round
where shapes are unsupported.

### Builder URL params

The builder state lives in the query string, so links are shareable and
reload-safe: `?n=…&p=…&s=…&bg=…&tx=…&ct=…&r=…&dx=…&dy=…&sh=…&cu=…`
(name, primary, secondary, background, text, contrast, radius, density-x/y,
shape, curve). Invalid values are ignored.

## 5. Token reference (excerpt)

Colors (all OKLCH): `--lui-bg`, `--lui-surface` (tinted with primary, never
colorless), `--lui-text`, `--lui-muted`,
`--lui-border` (contrast-driven), `--lui-primary` (+ `-hover`, `-active`, `--lui-on-primary`),
`--lui-secondary` (+ …), `--lui-success`, `--lui-warning`, `--lui-danger`,
`--lui-ring`, `--lui-chevron` (select arrow as SVG data URI).

Shape/size: `--lui-radius` (+ `-sm`, `-md`, `-lg`, `-full`), `--lui-radius-control`,
`--lui-corner-shape`, `--lui-contrast` (0..1, drives separation of borders,
segmented and toasts), `--lui-density` (master) or `--lui-density-x`/`-y`,
`--lui-control-h-sm/-md/-lg`, `--lui-check` (checkbox/radio/switch/slider),
`--lui-control-py/-px`, `--lui-space-1..4`,
`--lui-font-sans/-mono/-sm/-md/-lg`, `--lui-border-width`, `--lui-shadow-sm/-md`,
`--lui-maxw`. Complete list: `src/tokens.css`.

## 6. JS API (`src/enhance.js`, JSDoc in code)

| Function | Purpose |
|---|---|
| `restoreTheme()` | localStorage → `data-*` before paint |
| `bindThemeSwitchers()` | `data-lui-theme`/`data-lui-mode` selects (persistent, synced) |
| `bindDialogs()` | `data-lui-open`/`data-lui-close` + backdrop click |
| `enhanceTabs()` | `.tabs` → tablist (ARIA, roving tabindex, keys) |
| `enhanceOtp()` | `.otp` → advance, backspace, paste-split |
| `bindToasts()` / `showToast()` | toasts via `data-lui-toast` or `luiToast({tone,title,message,ms})` |

Builder (`site/app.js`, JSDoc everywhere): `derived()` (derive theme),
`snippet()` / `fullFile()` (export), `render()` (live; density applies on release),
`loadThemeIntoBuilder()` (theme → inputs), `applyUrlState()` / `pushUrlState()`
(shareable links), `cssToHex()`, `squirFactor()`.

## 7. No-JS matrix

Works without JS: system theme, all content, accordion/dropdown (`details`),
dialog via `open`, tabs (radio keys), OTP (type + paste), forms.
Needs JS: persistent theme choice, `showModal()`, tablist ARIA,
copy/download/share buttons (manual copy from `<pre>` works).

## 8. Browser support

Modern evergreen. With fallbacks: HEX before `color-mix`, gray ghost wash,
`@supports` for `corner-shape` and the surface floor. Test checklist in the
builder: light/dark/auto, keyboard-only, `prefers-reduced-motion`, no-JS.

## 9. Files

```
src/linkedui.css              entry point (layers + imports)
src/tokens.css                design tokens
src/reset.css                 mini reset
src/base.css                  classless base (buttons, forms, switch, slider, dialog …)
src/components/button.css     .btn + variants/states/sizes
src/components/card.css       container, grid, card, field, hints
src/components/feedback.css   alert, badge
src/components/nav-overlays.css nav, tooltip, dropdown, toasts
src/components/tabs.css       tabs (CSS-only)
src/components/segmented.css  segmented control (CSS-only)
src/components/otp.css        OTP (separate boxes + paste-split)
src/themes.css                all themes (default, ocean, squishy)
src/enhance.js                progressive enhancement (JSDoc)
site/index.html               theme builder, English (dogfoods the lib)
site/index-de.html            theme builder, German
site/app.js                   builder logic (JSDoc)
site/wiki.html                these docs as a page, English
site/wiki-de.html             these docs as a page, German
WIKI.md                       this file
```
