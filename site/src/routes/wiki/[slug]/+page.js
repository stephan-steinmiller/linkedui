import { error } from '@sveltejs/kit';
import enSrc from '$lib/content/wiki-src.html?raw';
import deSrc from '$lib/content/wiki-src-de.html?raw';
import { parseWiki, processBody, allSlugs, assertParity } from '$lib/wiki';

const en = parseWiki(enSrc);
const de = parseWiki(deSrc);
assertParity(en.flat, de.flat);

/** @type {import('./$types').EntryGenerator} */
export function entries() {
  return allSlugs(en.flat).map((slug) => ({ slug }));
}

/** @type {import('./$types').PageLoad} */
export function load({ params }) {
  const { slug } = params;
  const isDe = slug.endsWith('-de');
  const base = isDe ? slug.slice(0, -3) : slug;
  const flat = isDe ? de.flat : en.flat;
  const idx = flat.findIndex((p) => p.slug === base);
  if (idx < 0) {
    throw error(404, `unknown wiki slug: ${slug}`);
  }
  const page = flat[idx];
  const body = page.keepHeading
    ? `<h2 id="${page.slug}">${page.heading}</h2>\n` + page.body
    : page.body;
  return {
    lang: isDe ? 'de' : 'en',
    slug: base,
    title: page.title,
    subtitle: page.keepHeading ? null : page.subtitle,
    body: processBody(body, page.slug),
    groups: (isDe ? de : en).groups,
    flatSlugs: flat.map((p) => ({ slug: p.slug, title: p.title })),
    dialogs: (isDe ? de : en).dialogs,
    prev: idx > 0 ? flat[idx - 1] : null,
    next: idx + 1 < flat.length ? flat[idx + 1] : null
  };
}
