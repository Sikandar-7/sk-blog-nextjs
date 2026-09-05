import type { APIContext } from 'astro';

/**
 * /robots.txt — generated rather than served from `public/`.
 *
 * It used to be a static file, and it carried the deploy URL in two places:
 * the header comment and the `Sitemap:` line. That is fine until the site is
 * served from anywhere else, at which point robots.txt keeps pointing crawlers
 * at the old host's sitemap — and nothing warns you, because the file is valid,
 * the build passes, and the site looks correct. Google simply follows the
 * stale URL.
 *
 * Reading `context.site` (which comes from `PUBLIC_SITE_URL` via astro.config)
 * means the origin is declared once and every generated file agrees with it.
 * Same shape as llms.txt.ts and rss.xml.ts, which already work this way.
 */
export async function GET(context: APIContext) {
  const site = context.site?.toString().replace(/\/$/, '') ?? '';

  /** Signed-in areas: nothing here is useful in a search result, and the pages
   *  are already marked noindex. */
  const disallowed = ['/login', '/signup', '/write', '/dashboard', '/admin'];

  /** Answer engines are welcome. The whole point of writing these articles is
   *  for them to be found and quoted, whether that happens in a search result
   *  or in an assistant's answer — so the assistants get the same access as the
   *  crawlers, deliberately. */
  const answerEngines = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-User',
    'PerplexityBot',
    'Google-Extended',
    'Applebot-Extended',
    'CCBot',
  ];

  const lines: string[] = [
    `# SK Blog — ${site}`,
    '',
    'User-agent: *',
    'Allow: /',
    '',
    '# Signed-in areas: nothing here is useful in a search result, and the pages',
    '# are already marked noindex.',
    ...disallowed.map((path) => `Disallow: ${path}`),
    '',
    '# Answer engines are welcome. The whole point of writing these articles is for',
    '# them to be found and quoted, whether that happens in a search result or in',
    "# an assistant's answer — so the assistants get the same access as the",
    '# crawlers, deliberately.',
    '',
    ...answerEngines.flatMap((agent) => [`User-agent: ${agent}`, 'Allow: /', '']),
    `Sitemap: ${site}/sitemap-index.xml`,
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
