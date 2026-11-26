<script lang="ts">
  import { onMount } from 'svelte';
  import WikiNav from '$lib/WikiNav.svelte';
  import WikiSidebar from '$lib/WikiSidebar.svelte';
  import { lang as langOf } from '$lib/wiki';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const L = $derived(langOf(data.lang as 'en' | 'de'));
  const sfx = $derived(data.lang === 'de' ? '-de' : '');
  const builderHref = $derived(data.lang === 'de' ? '/de' : '/');
  const otherHref = $derived(
    data.lang === 'de' ? `/wiki/${data.slug}` : `/wiki/${data.slug}-de`
  );

  onMount(() => {
    document.documentElement.lang = data.lang;
  });
</script>

<svelte:head>
  <title>{data.title} — linkedui Wiki</title>
  <meta name="description" content={L.homeDesc} />
</svelte:head>

<WikiNav {L} {builderHref} wikiHref={data.lang === 'de' ? '/wiki-de' : '/wiki'} {otherHref} />

<div class="lui-container">
  <div class="with-sidebar">
    <aside>
      <WikiSidebar groups={data.groups} current={data.slug} {L} />
    </aside>
    <main id="main">
      <div class="stack">
        <div>
          <h1>{data.title}</h1>
          {#if data.subtitle}<p><small>{data.subtitle}</small></p>{/if}
        </div>
        {@html data.body}
        {#if data.prev || data.next}
          <hr />
          <div class="cluster">
            {#if data.prev}
              <a class="btn" data-variant="ghost" href="/wiki/{data.prev.slug}{sfx}"
                >{L.prev} {data.prev.title}</a
              >
            {/if}
            {#if data.next}
              <a class="btn" data-variant="ghost" href="/wiki/{data.next.slug}{sfx}"
                >{data.next.title} {L.next}</a
              >
            {/if}
          </div>
        {/if}
      </div>
    </main>
  </div>

  <footer class="footer"><div>
    <span>linkedui</span><span style="flex:1"></span><span><a href={builderHref}>{L.builder}</a></span
    ><span>{@html L.footerNote}</span>
  </div></footer>
</div>

{@html data.dialogs}
