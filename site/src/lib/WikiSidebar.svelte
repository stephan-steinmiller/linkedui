<script lang="ts">
  import type { WikiGroup, WikiLang } from '$lib/wiki';

  let { groups, current, L }: { groups: WikiGroup[]; current: string; L: WikiLang } = $props();

  const sfx = $derived(L.lang === 'de' ? '-de' : '');
</script>

<nav class="menu" aria-label={L.sideLabel}>
  {#each groups as group}
    {#if group.pages.length === 1 && group.pages[0].title === group.label}
      {@const only = group.pages[0]}
      <a href="/wiki/{only.slug}{sfx}" aria-current={only.slug === current ? 'page' : undefined}>{only.title}</a>
    {:else}
      <span>{group.label}</span>
      {#each group.pages as page}
        <a href="/wiki/{page.slug}{sfx}" aria-current={page.slug === current ? 'page' : undefined}>{page.title}</a>
      {/each}
    {/if}
  {/each}
</nav>
