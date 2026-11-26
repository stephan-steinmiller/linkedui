/** Shared parsed wiki data (groups + pages, EN + DE). */
import enSrc from '$lib/content/wiki-src.html?raw';
import deSrc from '$lib/content/wiki-src-de.html?raw';
import { parseWiki, assertParity, type WikiGroup, type WikiPage } from '$lib/wiki';

const en = parseWiki(enSrc);
const de = parseWiki(deSrc);

assertParity(en.flat, de.flat);

export const groupsEn: WikiGroup[] = en.groups;
export const groupsDe: WikiGroup[] = de.groups;
export const flatEn: WikiPage[] = en.flat;
export const flatDe: WikiPage[] = de.flat;
export const dialogsEn: string = en.dialogs;
export const dialogsDe: string = de.dialogs;
