<script lang="ts">
  import { onMount } from 'svelte';
  import WikiNav from '$lib/WikiNav.svelte';
  import WikiSidebar from '$lib/WikiSidebar.svelte';
  import WikiDirectory from '$lib/WikiDirectory.svelte';
  import { lang as langOf } from '$lib/wiki';
  import { groupsDe, flatDe, dialogsDe } from '$lib/site-data';

  const L = langOf('de');
  const redirectSrc = flatDe.map((p) => `${JSON.stringify(p.slug)}:${JSON.stringify(p.slug + '-de')}`).join(',');

  onMount(() => {
    document.documentElement.lang = 'de';
  });
</script>

<svelte:head>
  <title>{L.homeTitle}</title>
  <meta name="description" content={L.homeDesc} />
  {@html `<script>(function () { var map = {${redirectSrc}}; var h = location.hash.slice(1); if (map[h]) location.replace('./wiki/' + map[h] + '#' + h); })();</` + `script>`}
</svelte:head>

<WikiNav {L} builderHref="/de" wikiHref="/wiki-de" otherHref="/wiki" />

<div class="lui-container">
  <div class="with-sidebar">
    <aside>
      <WikiSidebar groups={groupsDe} current="__home__" {L} />
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
        <WikiDirectory groups={groupsDe} {L} />
      </div>
    </main>
  </div>

  <footer class="footer"><div>
    <span>linkedui</span><span style="flex:1"></span><span><a href="/de">{L.builder}</a></span><span
      >{@html L.footerNote}</span
    >
  </div></footer>
</div>

{@html dialogsDe}
