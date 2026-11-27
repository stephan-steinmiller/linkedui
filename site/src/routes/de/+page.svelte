<script lang="ts">
  import { onMount } from 'svelte';
  import Builder from '$lib/Builder.svelte';
  import Demo from '$lib/Demo.svelte';
  import { STRINGS } from '$lib/i18n';
  import { groupsDe } from '$lib/site-data';
  import { THEME_OPTIONS } from '$lib/theme-options';

  const t = STRINGS.de;

  onMount(() => {
    document.documentElement.lang = 'de';
  });
</script>

<svelte:head>
  <title>linkedui — CSS-first UI + Theme-Builder</title>
  <meta
    name="description"
    content="Classless Basis, Varianten via Klassen, Theming via CSS-Variablen. Ohne JS nutzbar, mit JS besser."
  />
</svelte:head>

<a class="skip-link" href="#main">{t.skip}</a>
<nav class="nav" aria-label={t.navAria}>
  <strong>linkedui</strong>
  <a href="#builder" aria-current="page">{t.builderLink}</a>
  <a href={t.componentsHref}>{t.componentsLink}</a>
  <a href={t.wikiHref}>Wiki</a>
  <a href={t.otherBuilderHref} hreflang={t.otherBuilderLang}>{t.otherBuilderLabel}</a>
  <span style="flex:1"></span>
  <form method="get" action="#builder" style="display:flex;gap:.5rem;align-items:center">
    <label class="visually-hidden" for="site-theme">{t.themeLabel}</label>
    <select id="site-theme" name="theme" data-lui-theme>
      {#each THEME_OPTIONS as opt}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
    <label class="visually-hidden" for="site-mode">{t.modeLabel}</label>
    <select id="site-mode" name="mode" data-lui-mode>
      <option value="auto">{t.modeAuto}</option>
      <option value="light">{t.modeLight}</option>
      <option value="dark">{t.modeDark}</option>
    </select>
    <noscript><button type="submit">OK</button></noscript>
  </form>
</nav>

<main class="lui-container stack" id="main">
  <header class="hero">
    <h1>{t.heroTitle}</h1>
    <p>
      {t.heroP1}
      {t.heroP2}
    </p>
    <div class="cluster">
      {#each t.badges as badge}
        <span class="badge">{badge}</span>
      {/each}
    </div>
  </header>

  <hr />

  <section id="builder" aria-label={t.builderAria}>
    <h2>{t.builderH2}</h2>
    <noscript><p><strong>Hinweis:</strong> {t.noscriptNote}</p></noscript>
    <Builder {t}>
      <Demo demo={t.demo} />
    </Builder>
  </section>

  <hr />

  <section id={t.dirId} aria-label={t.dirAria}>
    <h2>{t.dirH}</h2>
    <p>{@html t.dirP}</p>
    <div class="lui-grid">
      {#each groupsDe as group}
        <article class="card">
          <h3>{group.label}</h3>
          <ul class="dir-list">
            {#each group.pages as page}
              <li><a class="btn" data-variant="ghost" href="/wiki/{page.slug}-de">{@html page.title}</a></li>
            {/each}
          </ul>
        </article>
      {/each}
    </div>
  </section>

  <footer class="footer"><div>
    <span>linkedui</span><span style="flex:1"></span><span>{@html t.footerNote}</span>
  </div></footer>
</main>

<dialog id="demo-dialog" aria-label="Demo-Dialog">
  <h3>{t.dialogTitle}</h3>
  <p>{@html t.dialogText}</p>
  <button class="btn" type="button" data-lui-close>{t.dialogClose}</button>
</dialog>

<dialog class="drawer" data-side="right" id="demo-drawer" aria-label="Demo-Drawer">
  <h3>{t.drawerTitle}</h3>
  <p>{@html t.drawerText}</p>
  <button class="btn" type="button" data-lui-close>{t.drawerClose}</button>
</dialog>
