<script lang="ts">
  import type { WikiGroup, WikiLang } from '$lib/wiki';

  let { groups, L }: { groups: WikiGroup[]; L: WikiLang } = $props();

  const sfx = $derived(L.lang === 'de' ? '-de' : '');
</script>

<div class="lui-grid">
  {#each groups as group}
    <article class="card">
      <h3>{group.label}</h3>
      <ul class="dir-list">
        {#each group.pages as page}
          <li><a class="btn" data-variant="ghost" href="/wiki/{page.slug}{sfx}">{page.title}</a></li>
        {/each}
      </ul>
    </article>
  {/each}
</div>
