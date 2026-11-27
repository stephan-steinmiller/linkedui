# Changelog

What changed for consumers of linkedui, newest first. Load either `src/linkedui.css` (source)
or the generated `dist/linkedui.min.css` and `dist/enhance.min.js` (minified, no comments).
Run `python tools/minify.py` after any change in `src/` to regenerate `dist/`.

## Unreleased

### Added

- `--lui-control-border`: the border color of form controls (text inputs, selects, textareas,
  steppers, input groups, toggle chips). 3:1 against the field and the page in every theme.
- Dark palette `--lui-dark-*`: each theme sets its dark values as plain values. One mapping in
  `src/themes.css` applies them in `data-mode="dark"` and in auto. Custom themes can define these
  instead of a second dark block; explicit dark overrides still work.
- `src/components/forms.css`: the form controls, moved out of `card.css`. Same rules in the same
  order, so the split changes no rendering.
- Checks: non-text contrast (WCAG 1.4.11) for control borders, fills and focus rings; theme-name
  rules; the two dark mappings must match; minifier tests for theme pruning.
- Token `--lui-field-maxw` (default `28rem`): the width cap for form controls (text inputs,
  `select`, `textarea`, range, `progress`, `meter`). Set it on any container to change the cap
  for everything inside.
- Scope rule in `WIKI.md` (section 2): element rules only set defaults and never select inside a
  component.
- `tools/test_minify.py` fails if the shipped CSS contains a comment marker, and checks that
  `/*! ... */` legal comments are dropped as well.

### Changed

- Focus ring `--lui-ring` is now 80 % primary and 20 % text. It reached about 1.8:1 on light
  backgrounds; it now reaches 3:1 or better in every theme, so light themes get a darker ring.
- Form control borders use `--lui-control-border` (about 3.2:1 in light themes, about 3.8:1 in dark
  themes). They were `--lui-border`, about 1.25:1. Dividers and card edges keep `--lui-border`.
- Theme names: any lowercase name (letters, digits, hyphens) in the URL or in storage is applied, so
  your own themes work with the site's switcher. Other values are still ignored.
- `--theme` builds keep the `:root` base rules. Before, a single-theme build could lose base values
  such as `--lui-density-y`.
- The minified CSS is 94.6 KB (14.3 KB gzip), down from 100.8 KB (14.4 KB gzip): the six dark blocks
  are now one mapping.
- Dialog: a click on the dialog's own padding no longer closes it; only the backdrop does.
- Popover: ArrowDown and ArrowUp on the trigger open the menu and focus the first or last item;
  Escape closes it and returns focus to the trigger.
- Toasts: danger toasts use `role="alert"`, the other tones `role="status"`. Auto-dismiss pauses
  while a toast is hovered or focused.
- AI chat: the caret stops blinking under `prefers-reduced-motion`.
- Site: the wiki's theme menus share one list (`site/src/lib/theme-options.ts`). German pages carry
  `<html lang="de">` in the prerendered HTML.
- CI: the actions `checkout`, `setup-node` and `setup-python` use their v7 majors, which run on
  Node 24 (v4 and v5 ran on Node 20, which is being retired).
- `.field` lifts the cap through `--lui-field-maxw` instead of listing `input`, `select` and
  `textarea` one by one. Visible effect: `progress` and `meter` inside a `.field` are no longer
  capped at 28rem.
- The AI composer sets `--lui-field-maxw: none` on `.ai-composer` instead of overriding
  `max-width` on its textarea.
- `src/base.css` documents the scope rule in its header, and `src/tokens.css` and
  `src/components/card.css` document the field token. `dist/` is still generated without comments.

### Fixed

- Dark mode: outline buttons used the light-mode text color, because `--lui-secondary` was missing
  from every dark block. Each theme now defines its own.
- Dark mode: alert, badge and toast tints mixed each tone at 50 % into black, which left light
  text low in contrast. The dark share is now 36 % (`--lui-tone-pct`), so text keeps 4.5:1.
- System dark mode without `data-mode`: a page with `data-theme="ocean"` or `"squishy"` showed the
  default dark colors with that theme's radius. The dark colors now come from the theme.
- `tools/browser-tests.cjs`: the overflow check had been visiting the 404 view for the wiki pages.
  It now tests the real pages and fails on an error view.
