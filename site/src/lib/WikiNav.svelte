<script lang="ts">
  import type { WikiLang } from '$lib/wiki';
  import { THEME_OPTIONS } from '$lib/theme-options';

  let {
    L,
    builderHref,
    wikiHref,
    otherHref
  }: { L: WikiLang; builderHref: string; wikiHref: string; otherHref: string } = $props();
</script>

<a class="skip-link" href="#main">{L.skip}</a>
<nav class="nav" aria-label={L.navLabel}>
  <strong>linkedui</strong>
  <a href={builderHref}>{L.builder}</a>
  <a href={wikiHref} aria-current="page">{L.wiki}</a>
  <a href={otherHref} hreflang={L.otherLang}>{L.otherLabel}</a>
  <span style="flex:1"></span>
  <label class="visually-hidden" for="wiki-theme">{L.theme}</label>
  <select id="wiki-theme" data-lui-theme>
    {#each THEME_OPTIONS as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>
  <label class="visually-hidden" for="wiki-mode">{L.mode}</label>
  <select id="wiki-mode" data-lui-mode>
    <option value="auto">{L.modeAuto}</option>
    <option value="light">{L.modeLight}</option>
    <option value="dark">{L.modeDark}</option>
  </select>
</nav>
