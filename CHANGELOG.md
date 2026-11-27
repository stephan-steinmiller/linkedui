# Changelog

What changed for consumers of linkedui, newest first. Load either `src/linkedui.css` (source)
or the generated `dist/linkedui.min.css` and `dist/enhance.min.js` (minified, no comments).
Run `python tools/minify.py` after any change in `src/` to regenerate `dist/`.

## Unreleased

### Added

- Token `--lui-field-maxw` (default `28rem`): the width cap for form controls (text inputs,
  `select`, `textarea`, range, `progress`, `meter`). Set it on any container to change the cap
  for everything inside.
- Scope rule in `WIKI.md` (section 2): element rules only set defaults and never select inside a
  component.
- `tools/test_minify.py` fails if the shipped CSS contains a comment marker, and checks that
  `/*! ... */` legal comments are dropped as well.

### Changed

- `.field` lifts the cap through `--lui-field-maxw` instead of listing `input`, `select` and
  `textarea` one by one. Visible effect: `progress` and `meter` inside a `.field` are no longer
  capped at 28rem.
- The AI composer sets `--lui-field-maxw: none` on `.ai-composer` instead of overriding
  `max-width` on its textarea.
- `src/base.css` documents the scope rule in its header, and `src/tokens.css` and
  `src/components/card.css` document the field token. `dist/` is still generated without comments.
