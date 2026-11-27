# linkedui

CSS-first UI library: classless base, variants via classes, theming via CSS variables.
No build step and no dependencies for consumers.

- **Docs:** [WIKI.md](WIKI.md) (component markup reference, theming, build, file map).
- **Changes:** [CHANGELOG.md](CHANGELOG.md) lists what changed for consumers.
- **Use it:** `src/linkedui.css` (source) or `dist/linkedui.min.css` + `dist/enhance.min.js` (minified, checked in).
- **Docs site:** SvelteKit app in `site/` (`npm run dev` / `npm run build` there).

## Maintainers

```sh
python3 tools/minify.py           # rebuild dist/ after src/ changes
python3 tools/minify.py --check   # verify dist/ is current
python3 tools/test_minify.py      # minifier regression tests
node tools/browser-tests.cjs       # browser checks (needs Chrome; site/ built first)
cd site && npm run check          # svelte-check for the docs site
```
