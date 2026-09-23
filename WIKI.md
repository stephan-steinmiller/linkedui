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
  <a href="#main">Skip to content</a><!-- revealed on focus, no classes needed -->
  <main class="lui-container" id="main">
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

Buttons · Forms & input (+hints, OTP, check-chips, rating, dropzone) · Layout (card,
stat, toolbar, footer) · Navigation (nav, app-nav, breadcrumb, steps,
pagination, tabs, segmented) · Overlays (popover, tooltip, dropdown,
toasts, dialog, drawer, sheet) · Content (tables, lists, quotes, figures,
timeline, carousel, avatar, chat) · Feedback (alert, badge, chip,
skeleton, spinner) · Empty states.

### Buttons — `src/components/button.css`

```html
<button class="btn">Primary</button>
<button class="btn" data-variant="secondary">Secondary</button>
<button class="btn" data-variant="accent">Accent</button>
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

### Forms & input — classless (`src/base.css`)

```html
<label class="field"><span>Name</span><input placeholder="…" /></label>
<select><option>…</option></select><!-- custom chevron, follows the theme -->
<textarea></textarea>
<input type="checkbox" checked /> <input type="radio" name="g" checked />
<label class="switch">
  <input type="checkbox" role="switch" checked /><span aria-hidden="true"></span> Wi-Fi
</label><!-- data-variant="secondary" tints switch, range, checkbox, radio, progress -->
<input type="range" min="0" max="100" value="60" />
<input type="range" min="0" max="100" step="25" value="50" data-variant="secondary" aria-label="Quality" />
<input type="range" min="0" max="100" step="25" value="50" aria-label="Quality" />
<div class="ticks" style="--lui-ticks: 5" aria-hidden="true"></div><!-- stops match min/max/step -->
<div class="check-chips" role="group" aria-label="Filters"><!-- multi-select pills -->
  <input type="checkbox" id="f-photo" checked /><label for="f-photo">Photo</label>
  <input type="checkbox" id="f-video" /><label for="f-video">Video</label>
</div>
<div class="rating" role="radiogroup" aria-label="Rate this"><!-- stars, 5→1 in DOM -->
  <input type="radio" name="rate" id="rate-5" value="5" /><label for="rate-5" aria-label="5 stars">★</label>
  <!-- … down to 1 … -->
</div>
<label class="dropzone"><input type="file" /><!-- click-to-browse card -->
  <span aria-hidden="true">⇪</span>
  <span><strong>Drop files here</strong><small>or click to browse</small></span>
</label>
<input type="color" value="#4f7dd9" />
<label class="field"><span>Report</span><progress value="60" max="100">60%</progress></label>
<progress>Loading…</progress><!-- indeterminate (no value): sweeping fill -->
<label class="field"><span>Attachment</span><input type="file" /></label>
<label class="field"><span>Due</span><input type="date" /></label><!-- date/time/month/week inherit the input style -->
<label class="field"><span>Quota</span><meter value="0.8" min="0" max="1" low="0.3" high="0.75" optimum="0.9">80%</meter></label>
<div class="input-group">
  <span aria-hidden="true">$</span><input aria-label="Amount" placeholder="0.00" />
  <button class="btn" type="button">Send</button>
</div>
<div class="form-grid">
  <label class="field"><span>First</span><input /></label>
  <label class="field"><span>Last</span><input /></label>
  <label class="field" data-span="all"><span>Bio</span><textarea></textarea></label>
</div>
```

Single-line controls (button, input, select) share exactly one height
(`--lui-control-h-md`, 48px — every control clears the 44pt touch
guideline for real). Sizes scale both axes: `sm` 44px, `md` 48px,
`lg` 56px. Checkbox/radio are control-S sized.

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

### Layout — `src/components/card.css`

```html
<main class="lui-container">
  <div class="lui-grid">
    <article class="card"><h3>Title</h3><p>Text</p></article>
  </div>
</main>
```

Bare `<article>` without class already looks like `.card`.

```html
<div class="toolbar">
  <h3 class="toolbar-title">Users</h3>
  <input type="search" aria-label="Search users" placeholder="Search" />
  <button class="btn" type="button">Invite</button>
</div>
<footer class="footer"><div>
  <span>© 2026 Acme</span><span style="flex:1"></span><a href="/imprint">Imprint</a>
</div></footer>
```
<div class="stat"><span>ARR</span><strong>$1.2M</strong><small data-trend="up">+12%</small></div>
<!-- small data-trend: up (success) | down (danger) | none (muted) -->

### Nav + section menu — `src/components/nav-overlays.css`

```html
<nav class="nav">
  <strong>Logo</strong>
  <a href="/" aria-current="page">Active</a>
</nav>
<nav class="menu" aria-label="Settings"><!-- in-flow section nav, never leaves the page -->
  <span>Account</span>
  <a href="/profile" aria-current="page">Profile</a>
  <a href="/billing">Billing</a>
</nav>
```

### App nav — `src/components/app-nav.css`

Adaptive primary navigation: fixed sidebar (icon rail, expandable) on
desktop, bottom tab bar on mobile (width-only breakpoint at 48rem —
`pointer: coarse` only sizes targets, never switches layout). Collapse is
a native `<details>` toggle read via `:has()`, no JS needed. Per link
exactly one icon span (`aria-hidden`) + one label span; rail mode hides
labels with the visually-hidden pattern so links keep their names.

```html
<nav class="app-nav" aria-label="Primary">
  <a href="/" aria-current="page"><span aria-hidden="true">⌂</span><span>Home</span></a>
  <a href="/s"><span aria-hidden="true">⌕</span><span>Search</span></a>
  <details class="app-nav-toggle">
    <summary aria-label="Toggle navigation"></summary>
  </details>
</nav>
```

As a direct `body` child the page padding follows rail/open/bottom-bar
automatically (`body:has()`). 3–5 links max. Widths via
`--lui-app-nav-w` / `--lui-app-nav-w-rail`. Ship `open` on the details
to default to the wide sidebar.

### Breadcrumb, steps

```html
<nav class="breadcrumb" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><span aria-current="page">Install</span></li>
  </ol>
</nav>
<ol class="steps"><!-- pure CSS counters, no JS -->
  <li data-state="done"><span>Cart</span></li>
  <li aria-current="step"><span>Payment</span></li>
  <li><span>Done</span></li>
</ol>
```

### Pagination — `src/components/nav-overlays.css` (pure CSS)

Plain links as small control-height buttons; current page is a primary
fill marked with `aria-current="page"`. Ellipsis is a bare span.

```html
<nav class="pagination" aria-label="Pages">
  <a href="?p=1" aria-label="Previous">‹</a>
  <a href="?p=1">1</a>
  <span aria-current="page">2</span>
  <a href="?p=3">3</a>
  <span aria-hidden="true">…</span>
  <a href="?p=9" aria-label="Next">›</a>
</nav>
```

### Tabs — `src/components/tabs.css`

Order per tab matters: `input → label → section` as direct children.
Without JS: native radio group (Tab + arrow keys work natively).
With JS: `tablist` roles, roving tabindex, Home/End.

```html
<div class="tabs" data-orientation="vertical"><!-- settings-style side tabs -->
  <input type="radio" name="t" id="t1" checked />
  <label for="t1">Overview</label>
  <section><p>Panel 1</p></section>
  <input type="radio" name="t" id="t2" />
  <label for="t2">Details</label>
  <section><p>Panel 2</p></section>
  <!-- … horizontal again under 48rem … -->
</div>
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

### Popover menu — `src/components/popover.css` + `enhance.js`

Trigger + floating panel, `details`-first (click/Enter/Space/Tab work
without JS). With JS: ESC + outside-click close. Placements: top |
bottom (default) | left | right — same vocabulary as toasts.

```html
<details class="popover" data-placement="bottom">
  <summary>Trigger</summary>
  <div role="menu">
    <a href="…" role="menuitem">Entry</a>
    <button type="button" role="menuitem">Action</button>
    <hr />
    <a href="…" role="menuitem">More</a>
  </div>
</details>
```

### Tooltip, dropdown — classless

```html
<span data-tooltip="Pure CSS">Hover me</span>
<details class="dropdown">
  <summary>Menu</summary>
  <div><a href="…">Entry</a></div>
</details>
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

### Dialog — native + `enhance.js`

```html
<button data-lui-open="info">Open</button>
<dialog id="info"><!-- data-size: sm (confirms) | lg (wide content) -->
  <h3>Title</h3>
  <button data-lui-close>Close</button>
</dialog>
```

ESC + backdrop click included. Without JS: set the `open` attribute.

### Drawer — `src/components/drawer.css` (no extra JS)

Side/bottom sheet via `<dialog>` — same plumbing as modal
(`data-lui-open`, ESC, backdrop). `data-side`: left | right (default) |
bottom. Slide-in animation respects `prefers-reduced-motion`.

```html
<button data-lui-open="nav">Menu</button>
<dialog class="drawer" data-side="left" id="nav" aria-label="Menu">
  …
  <button data-lui-close>Close</button>
</dialog>
```

### Sheet — `src/components/drawer.css` (responsive modal)

Bottom sheet with grab handle on mobile, centered modal card from
48rem up. Same plumbing (`data-lui-open`, ESC, backdrop).

```html
<button data-lui-open="filters">Filters</button>
<dialog class="sheet" id="filters" aria-label="Filters">
  …
  <button data-lui-close>Done</button>
</dialog>
```

### Tables, lists, quotes, figures — classless + `src/components/card.css`

```html
<table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Ada</td></tr></tbody></table>
<div class="table-wrap"><table data-stripes="true" data-hover="true" data-sticky="true">
  <caption>Q3 revenue</caption>
  <thead><tr><th>Plan</th><th data-numeric="true">MRR</th></tr></thead>
  <tbody><tr><td>Pro</td><td data-numeric="true">12,400</td></tr></tbody>
</table></div>
<details><summary>More</summary><p>Content</p></details>
<dl><dt>Plan</dt><dd>Pro, monthly</dd></dl><!-- term/definition grid -->
<ul><li>Unstyled lists get markers + rhythm back, classless</li></ul>
<blockquote><p>Stay classy.</p><cite>— San Diego</cite></blockquote>
<figure><img src="ada.jpg" alt="Ada" /><figcaption>Ada, 1843.</figcaption></figure>
<hr data-text="or" /><!-- labeled divider, still classless -->
<ol class="timeline"><!-- activity feed, current via aria-current -->
  <li><strong>Shipped</strong><p>v2.0 is live.</p><small>10:24</small></li>
  <li aria-current="step"><strong>Rollout</strong><p>60% of traffic.</p><small>now</small></li>
</ol>
<div class="carousel" role="region" aria-label="Gallery" tabindex="0"><!-- scroll-snap -->
  <figure id="shot-1"><img src="a.jpg" alt="A" /><figcaption>One</figcaption></figure>
  <!-- … prev/next are plain <a href="#shot-1"> links … -->
</div>
```

### Avatar — `src/components/avatar.css`

```html
<span class="avatar" data-size="sm">AL</span><!-- sm | (md) | lg -->
<span class="avatar" data-status="online">BO</span><!-- online | away | busy | off -->
<span class="avatar"><img src="ada.jpg" alt="Ada" /></span>
<span class="avatar-stack"><span class="avatar">AL</span><span class="avatar">BO</span><span class="avatar" data-more="+3"></span></span>
```

### Chat bubbles — `src/components/chat.css`

Left = incoming on surface, right = outgoing on primary. Consecutive
same-side messages group tighter automatically (`:has()`).

```html
<div class="chat" role="log" aria-label="Support chat">
  <div class="bubble" data-side="left"><p>Hi!</p><small>10:24</small></div>
  <div class="bubble" data-side="right"><p>Hello!</p><small>10:25</small></div>
</div>
```

### Feedback — `src/components/feedback.css`

```html
<div class="alert" data-tone="success"><span>Done!</span></div>
<!-- data-tone: success | warning | danger (none: neutral) -->
<span class="badge">New</span>
<span class="chip">Photo<button type="button" data-lui-chip-close aria-label="Remove photo filter">×</button></span>
<!-- chip removal is app JS (el.remove()); everything else here is CSS-only -->
<!-- skeleton: shimmer placeholder, pair with screen-reader text -->
<span class="skeleton" style="width:12rem" aria-hidden="true"></span>
<span class="visually-hidden">Loading…</span>
<span class="spinner" role="status" aria-label="Loading"></span>
```

### Empty states

```html
<div class="empty">
  <span aria-hidden="true">○</span>
  <h3>No results</h3>
  <p>Try a different search.</p>
  <button class="btn" type="button">Clear search</button>
</div>
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
reload-safe: `?n=…&p=…&s=…&a=…&bg=…&tx=…&ct=…&r=…&dx=…&dy=…&sh=…&cu=…`
(name, primary, secondary, background, text, contrast, radius, density-x/y,
shape, curve). Invalid values are ignored.

## 5. Token reference (excerpt)

Colors (all OKLCH): `--lui-bg`, `--lui-surface` (accent-tinted, never
colorless), `--lui-field` (controls, contrast-driven), `--lui-text`, `--lui-muted`,
`--lui-border` (contrast-driven), `--lui-primary` (+ `-hover`, `-active`, `--lui-on-primary`),
`--lui-secondary` (+ …), `--lui-accent` (+ `-hover`, `-active`, `--lui-on-accent`,
feeds surfaces + `data-variant="accent"`), `--lui-success`, `--lui-warning`, `--lui-danger`,
`--lui-info` (toast info, always blue), `--lui-ring`, `--lui-chevron` (select arrow as SVG data URI).

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
| `bindPopovers()` | `.popover` ESC + outside-click close |
| `enhanceTabs()` | `.tabs` → tablist (ARIA, roving tabindex, keys) |
| `enhanceOtp()` | `.otp` → advance, backspace, paste-split |
| `bindToasts()` / `showToast()` | toasts via `data-lui-toast` or `luiToast({tone,title,message,ms})` |

Builder (`site/app.js`, JSDoc everywhere): `derived()` (derive theme),
`snippet()` / `fullFile()` (export), `render()` (live; density applies on release),
`loadThemeIntoBuilder()` (theme → inputs), `applyUrlState()` / `pushUrlState()`
(shareable links), `cssToHex()`, `squirFactor()`.

## 7. No-JS matrix

Works without JS: system theme, all content, accordion/dropdown (`details`),
popover toggle (`details`), dialog via `open`, drawer via `open`, tabs
(radio keys), OTP (type + paste), forms, pagination (links).
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
src/components/card.css       container, grid, card, field, hints, empty state
src/components/steps.css      stepper (CSS counters)
src/components/feedback.css   alert, badge, skeleton
src/components/chat.css       chat bubbles (static, no JS)
src/components/avatar.css     avatar (initials/photo, status)
src/components/nav-overlays.css nav, tooltip, dropdown, pagination, toasts
src/components/app-nav.css     app nav (adaptive sidebar ↔ bottom bar, CSS-only)
src/components/popover.css   popover menu (details-first)
src/components/drawer.css    drawer + modal sheet via dialog
src/components/tabs.css       tabs (CSS-only)
src/components/segmented.css  segmented control (CSS-only)
src/components/rating.css     star rating (CSS-only)
src/components/timeline.css   activity feed (CSS-only)
src/components/carousel.css   scroll-snap slider (CSS-only)
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
