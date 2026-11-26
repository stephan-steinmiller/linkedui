/**
 * linkedui site — wiki splitter ported from the old site/split-wiki.py.
 * Parses the single-source wiki-src.html files (regex, like the original)
 * into groups/pages for the SvelteKit routes. Page bodies come out with
 * tables wrapped (.table-wrap) and code samples wrapped (.code-block),
 * and internal hrefs rewritten to app routes.
 */

export interface WikiPage {
  slug: string;
  title: string;
  subtitle: string | null;
  heading: string;
  body: string;
  keepHeading: boolean;
}

export interface WikiGroup {
  id: string;
  label: string;
  pages: WikiPage[];
}

export interface WikiLang {
  lang: 'en' | 'de';
  skip: string;
  navLabel: string;
  builder: string;
  wiki: string;
  /** [href-template, label, hreflang] for the language toggle */
  otherHref: (slug: string) => string;
  otherLabel: string;
  otherLang: string;
  theme: string;
  mode: string;
  modeAuto: string;
  modeLight: string;
  modeDark: string;
  sideLabel: string;
  homeTitle: string;
  homeIntro: string;
  homeDesc: string;
  prev: string;
  next: string;
  footerBuilderHref: string;
  footerNote: string;
  dirLead: string;
}

const LANG: Record<'en' | 'de', WikiLang> = {
  en: {
    lang: 'en',
    skip: 'Skip to content',
    navLabel: 'Main navigation',
    builder: 'Builder',
    wiki: 'Wiki',
    otherHref: (slug: string) => `/wiki/${slug}-de`,
    otherLabel: 'Deutsch',
    otherLang: 'de',
    theme: 'Theme',
    mode: 'Mode',
    modeAuto: 'auto (system)',
    modeLight: 'light',
    modeDark: 'dark',
    sideLabel: 'Documentation',
    homeTitle: 'linkedui Wiki',
    homeIntro:
      'CSS-first UI library: classless base, variants via classes, ' +
      'theming via variables. Every component below has its own page ' +
      'with live demos — this site uses only the library itself. ' +
      'Full text: <code>WIKI.md</code> in the repo.',
    homeDesc: 'linkedui docs: every component on its own page, with live demos.',
    prev: '←',
    next: '→',
    footerBuilderHref: '/',
    footerNote: 'Full text: <code>WIKI.md</code>',
    dirLead: 'One page per component — pick a topic in the sidebar.'
  },
  de: {
    lang: 'de',
    skip: 'Zum Inhalt springen',
    navLabel: 'Hauptnavigation',
    builder: 'Builder',
    wiki: 'Wiki',
    otherHref: (slug: string) => `/wiki/${slug.replace(/-de$/, '')}`,
    otherLabel: 'English',
    otherLang: 'en',
    theme: 'Theme',
    mode: 'Modus',
    modeAuto: 'auto (System)',
    modeLight: 'hell',
    modeDark: 'dunkel',
    sideLabel: 'Dokumentation',
    homeTitle: 'linkedui Wiki',
    homeIntro:
      'CSS-first-UI-Bibliothek: classless Basis, Varianten via Klassen, ' +
      'Theming via Variablen. Jede Komponente unten hat eine eigene Seite ' +
      'mit Live-Demos — diese Site nutzt nur die Bibliothek selbst. ' +
      'Volltext: <code>WIKI.md</code> im Repo (Englisch).',
    homeDesc: 'linkedui-Doku: jede Komponente auf eigener Seite, mit Live-Demos.',
    prev: '←',
    next: '→',
    footerBuilderHref: '/de',
    footerNote: 'Volltext: <code>WIKI.md</code> (Englisch)',
    dirLead: 'Eine Seite pro Komponente — Thema in der Sidebar wählen.'
  }
};

export const lang = (l: 'en' | 'de'): WikiLang => LANG[l];

const HEADING_RE = /^    <h([23]) id="([^"]+)">(.*)$/;
const FOOTER_RE = /    <footer class="footer">.*?<\/footer>\n?/s;
const NUM_RE = /^\d+\.\s+/;
const SMALL_RE = /\s*<small>(.*)<\/small>\s*$/s;
const PRE_RE = /(^[ \t]*)<pre><code([^>]*)>(.*?)<\/code><\/pre>/gms;

function stripSmallEnd(inner: string): string {
  return inner.replace(/\s*<\/h[23]>\s*$/, '');
}

/** Rewrite site-relative hrefs to app routes (flat .html output serves everywhere). */
export function rewriteHrefs(body: string): string {
  return body
    .replaceAll('href="./wiki-de.html"', 'href="/wiki-de"')
    .replaceAll('href="./wiki.html"', 'href="/wiki"')
    .replaceAll('href="./index-de.html"', 'href="/de"')
    .replaceAll('href="./index.html"', 'href="/index.html"')
    .replaceAll('href="../wiki-de.html"', 'href="/wiki-de"')
    .replaceAll('href="../wiki.html"', 'href="/wiki"')
    .replaceAll('href="../index-de.html"', 'href="/de"')
    .replaceAll('href="../index.html"', 'href="/index.html"');
}

/** Wrap bare <table> blocks in .table-wrap (scroll frame). */
function wrapTables(body: string): string {
  const lines = body.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const m = /^(\s*)<table[ >]/.exec(lines[i]);
    const prev = out.length ? out[out.length - 1] : '';
    if (m && !prev.includes('table-wrap')) {
      const ind = m[1];
      out.push(`${ind}<div class="table-wrap">`);
      while (i < lines.length) {
        out.push(lines[i]);
        if (lines[i].includes('</table>')) break;
        i += 1;
      }
      out.push(`${ind}</div>`);
    } else {
      out.push(lines[i]);
    }
    i += 1;
  }
  return out.join('\n');
}

/** Unescape HTML entities (for language detection of code samples). */
function unescapeHtml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
}

/**
 * Wrap bare <pre><code> samples in .code-block figures (caption + copy
 * button, language for enhance.js highlighting). Blocks whose <code>
 * already has an id (live copy demos) reuse it and get no second button.
 */
function wrapCode(body: string, slug: string): string {
  let n = 0;
  return body.replace(PRE_RE, (_m, ind: string, attrs: string, content: string) => {
    n += 1;
    const raw = unescapeHtml(content.replace(/<[^>]+>/g, ''));
    const clang = raw.trim().startsWith('<') ? 'html' : 'text';
    const caption = clang === 'html' ? 'HTML' : 'Text';
    const im = /id="([^"]+)"/.exec(attrs);
    let head: string;
    let pre: string;
    if (im) {
      head =
        `${ind}<figure class="code-block" data-lang="${clang}">\n` +
        `${ind}  <figcaption><span>${caption}</span></figcaption>`;
      pre = `${ind}<pre><code${attrs}>${content}</code></pre>`;
    } else {
      const cid = `code-${slug}-${n}`;
      head =
        `${ind}<figure class="code-block" data-lang="${clang}">\n` +
        `${ind}  <figcaption><span>${caption}</span>` +
        `<button class="btn" data-variant="ghost" data-size="sm" type="button" ` +
        `data-lui-copy="${cid}">Copy</button></figcaption>`;
      pre = `${ind}<pre><code id="${cid}">${content}</code></pre>`;
    }
    return `${head}\n${pre}\n${ind}</figure>`;
  });
}

interface RawPage {
  slug: string;
  title: string;
  subtitle: string | null;
  heading: string;
  body: string;
  keepHeading: boolean;
}

/** Plain text from heading HTML: strip tags, decode entities. */
function text(html: string): string {
  return unescapeHtml(html.replace(/<[^>]+>/g, '')).trim();
}

/** Parse one wiki-src.html document into groups + flat page list. */
export function parseWiki(source: string): { groups: WikiGroup[]; flat: RawPage[]; dialogs: string } {
  const parts = source.split('  </main>');
  const main = parts[0];
  const dialogs = parts
    .slice(1)
    .join('  </main>')
    .split('<script src=')[0]
    .trim();
  const lines = main.split('\n');
  const heads: { i: number; level: string; hid: string; inner: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = HEADING_RE.exec(lines[i]);
    if (m) heads.push({ i, level: m[1], hid: m[2], inner: stripSmallEnd(m[3]) });
  }
  const groups: WikiGroup[] = [];
  let cur: WikiGroup & { _h3: RawPage[] & { heading: string }[] } | null = null;
  heads.forEach((h, idx) => {
    const end = idx + 1 < heads.length ? heads[idx + 1].i : lines.length;
    const body = lines.slice(h.i + 1, end).join('\n');
    if (h.level === '2') {
      let label = text(h.inner.replace(/\s*<small>.*<\/small>\s*$/s, ''));
      label = label.replace(NUM_RE, '').trim();
      label = label.replace(/\s*\(.*?\)\s*$/, '').trim();
      cur = { id: h.hid, label, pages: [], _h3: [] };
      groups.push(cur);
    } else if (cur) {
      const sm = SMALL_RE.exec(h.inner);
      const subtitle = sm ? text(sm[1]).trim() : null;
      const titleMain = text(h.inner.replace(SMALL_RE, '').trim());
      cur._h3.push({ slug: h.hid, title: titleMain, subtitle, heading: h.inner.trim(), body, keepHeading: false });
    }
  });
  const flat: RawPage[] = [];
  for (const g of groups) {
    const h3 = (g as unknown as { _h3: RawPage[] })._h3;
    if (h3.length) {
      if (h3.length === 1) {
        const p = h3[0];
        p.title = g.label;
        p.slug = g.id;
        p.keepHeading = true;
      } else {
        for (const p of h3) p.keepHeading = false;
      }
      g.pages = h3;
    } else {
      const hi = heads.findIndex((h) => h.level === '2' && h.hid === g.id);
      const nxt = heads.find((h, k) => h.level === '2' && k > hi);
      const end = nxt ? heads.indexOf(nxt) : lines.length;
      let body = lines.slice(hi + 1, end).join('\n');
      body = body.replace(FOOTER_RE, '').trim() + '\n';
      g.pages = [{ slug: g.id, title: g.label, subtitle: null, heading: '', body, keepHeading: false }];
    }
    flat.push(...g.pages);
  }
  return { groups, flat, dialogs };
}

/** Post-process a page body: tables, code blocks, hrefs. */
export function processBody(body: string, slug: string): string {
  return rewriteHrefs(wrapCode(wrapTables(body), slug));
}

/**
 * All route slugs: EN base slugs plus `-de`-suffixed German variants
 * (mirrors the old `foo.html` / `foo-de.html` file scheme).
 */
export function allSlugs(flatEn: RawPage[]): string[] {
  return [...flatEn.map((p) => p.slug), ...flatEn.map((p) => `${p.slug}-de`)];
}

/** Assert the EN/DE structures match (slugs + order), like split-wiki.py did. */
export function assertParity(flatEn: RawPage[], flatDe: RawPage[]): void {
  const en = flatEn.map((p) => p.slug);
  const de = flatDe.map((p) => p.slug);
  if (en.length !== de.length || !en.every((s, i) => de[i] === s)) {
    throw new Error(`EN/DE page order diverged: ${en.join(',')} vs ${de.join(',')}`);
  }
  if (en.some((s) => s.endsWith('-de'))) {
    throw new Error('EN slug ends with -de — language detection by suffix is ambiguous');
  }
}
