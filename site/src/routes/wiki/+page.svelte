<script lang="ts">
  import { onMount } from 'svelte';
  import WikiNav from '$lib/WikiNav.svelte';
  import WikiSidebar from '$lib/WikiSidebar.svelte';
  import WikiDirectory from '$lib/WikiDirectory.svelte';
  import { lang as langOf } from '$lib/wiki';
  import { groupsEn, flatEn, dialogsEn } from '$lib/site-data';

  const L = langOf('en');
  const redirectSrc = flatEn.map((p) => `${JSON.stringify(p.slug)}:${JSON.stringify(p.slug)}`).join(',');

  onMount(() => {
    document.documentElement.lang = 'en';
  });
</script>

<svelte:head>
  <title>{L.homeTitle}</title>
  <meta name="description" content={L.homeDesc} />
  {@html `<script>(function () { var map = {${redirectSrc}}; var h = location.hash.slice(1); if (map[h]) location.replace('./wiki/' + map[h] + '#' + h); })();</` + `script>`}
</svelte:head>

<WikiNav {L} builderHref="/" wikiHref="/wiki" otherHref="/wiki-de" />

<div class="lui-container">
  <div class="with-sidebar">
    <aside>
      <WikiSidebar groups={groupsEn} current="__home__" {L} />
    </aside>
    <main id="main">
      <div class="stack">
        <div>
          <h1>{L.homeTitle}</h1>
        </div>
        <div>
          <p>{@html L.homeIntro}</p>
          <p><small>{L.dirLead}</small></p>
        </div>
        <WikiDirectory groups={groupsEn} {L} />
      </div>
    </main>
  </div>

  <footer class="footer"><div>
    <span>linkedui</span><span style="flex:1"></span><span><a href="/">{L.builder}</a></span><span
      >{@html L.footerNote}</span
    >
  </div></footer>
</div>

{@html dialogsEn}
