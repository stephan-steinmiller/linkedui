import type { Handle } from '@sveltejs/kit';

/**
 * German routes are /de, /wiki-de and /wiki/<slug>-de. Their prerendered HTML
 * must carry lang="de" from the first byte: crawlers, screen readers and
 * no-JS readers never run onMount. The pages still set it on client-side
 * navigation.
 */
function langFor(pathname: string): 'en' | 'de' {
  return /^\/(de|wiki-de)$/.test(pathname) || /-de$/.test(pathname) ? 'de' : 'en';
}

export const handle: Handle = async ({ event, resolve }) => {
  const lang = langFor(event.url.pathname);
  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('<html lang="en"', `<html lang="${lang}"`)
  });
};
