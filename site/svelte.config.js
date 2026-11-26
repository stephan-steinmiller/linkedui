import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: undefined,
      strict: true
    }),
    prerender: {
      // Demo placeholder links (#footer Imprint/Privacy, pager #anchors…)
      // intentionally point nowhere — warn, don't fail. Missing ROUTES
      // still fail the build.
      handleMissingId: 'warn'
    }
  }
};

export default config;
