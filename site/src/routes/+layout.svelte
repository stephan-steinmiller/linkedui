<script lang="ts">
  import '../../../src/linkedui.css';
  import '../app.css';
  import { onMount } from 'svelte';

  onMount(async () => {
    // Progressive enhancement for every page (theme switchers, dialogs,
    // popovers, tabs, OTP, toasts, copy buttons, code highlighting).
    // Client-only: never runs during prerendering.
    // @ts-expect-error - side-effect import of the plain-JS lib bundle
    await import('../../../src/enhance.js');
  });

  let { children } = $props();
</script>

{@render children()}
