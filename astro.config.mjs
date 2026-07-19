// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://sk-blog-nextjs-8fw1.vercel.app',

  // Fully static output: every article is pre-rendered to HTML at build time and
  // served straight from the CDN. Anything interactive (auth, comments, likes,
  // the editor) runs as a client island talking to Supabase directly, so a
  // reader never waits on a database query.
  output: 'static',

  integrations: [mdx(), react(), sitemap()],

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
