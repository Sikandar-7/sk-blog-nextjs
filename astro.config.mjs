// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import preact from '@astrojs/preact';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

import { isPrivateRoute } from './src/lib/private-routes';

// The canonical origin, read at build time so each host can declare its own.
//
// `site` is not decoration: sitemap.xml, the RSS feed and every canonical tag
// are built from it. Hardcoding one host means the moment the site is served
// from anywhere else, it keeps announcing the old address — and nothing warns
// you, because the build succeeds and the pages look fine.
//
// Set PUBLIC_SITE_URL in the host's environment (Dokploy, Vercel, wherever).
// The fallback keeps local dev and any un-configured build working.
const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://sk-blog-nextjs-8fw1.vercel.app';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,

  // Fully static output: every article is pre-rendered to HTML at build time and
  // served straight from the CDN. Anything interactive (auth, comments, likes,
  // the editor) runs as a client island talking to Supabase directly, so a
  // reader never waits on a database query.
  output: 'static',

  integrations: [
    mdx(),
    preact(),
    // Signed-in routes are disallowed in robots.txt; submitting them here too
    // asks Google to index pages it is simultaneously told not to read, which
    // Search Console reports as an error. Same list drives both files.
    sitemap({ filter: (page) => !isPrivateRoute(new URL(page).pathname) }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  build: {
    // Emit `/blog/post-name/index.html` so URLs stay clean without a server.
    format: 'directory',
  },

  prefetch: {
    // Prefetch links as they enter the viewport — navigation feels instant.
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
