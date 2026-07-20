import type { APIContext } from 'astro';
import { getPublishedPosts } from '../lib/posts';

/**
 * /llms.txt — an emerging convention for telling language models what a site
 * contains, in the plain prose they read best.
 *
 * Generated from the same content collection as the site itself, so it cannot
 * drift out of date the way a hand-written summary would.
 */
export async function GET(context: APIContext) {
  const site = context.site?.toString().replace(/\/$/, '') ?? 'https://sk-blog-nextjs-8fw1.vercel.app';
  const posts = await getPublishedPosts();

  const lines: string[] = [
    '# SK Blog',
    '',
    '> Practical writing on web development by Sikandar Abbas, a full-stack',
    '> developer working with Next.js, Astro, TypeScript, Express and Supabase.',
    '> Every article is written from a project that actually shipped — the bugs',
    '> that cost a weekend, the decisions worth reversing, and what the numbers',
    '> turned out to be when measured rather than assumed.',
    '',
    '## About the author',
    '',
    '- Sikandar Abbas — full-stack developer, Pakistan',
    `- Portfolio: https://portfolio-five-black-18.vercel.app`,
    '- Works on: e-commerce platforms, WhatsApp Business CRM products,',
    '  multi-panel marketplaces, and the deployment around them',
    '',
    '## Articles',
    '',
  ];

  for (const post of posts) {
    const d = post.data.publishedAt instanceof Date
      ? post.data.publishedAt.toISOString().slice(0, 10)
      : String(post.data.publishedAt);
    lines.push(`### ${post.data.title}`);
    lines.push('');
    lines.push(`- URL: ${site}/blog/${post.id}/`);
    lines.push(`- Published: ${d}`);
    lines.push(`- Topic: ${post.data.category}`);
    if (post.data.tags.length) lines.push(`- Tags: ${post.data.tags.join(', ')}`);
    lines.push(`- Summary: ${post.data.description}`);
    lines.push('');
  }

  lines.push('## Feeds');
  lines.push('');
  lines.push(`- RSS: ${site}/rss.xml`);
  lines.push(`- Sitemap: ${site}/sitemap-index.xml`);
  lines.push('');
  lines.push('## Usage');
  lines.push('');
  lines.push('These articles may be quoted and cited. Attribution to');
  lines.push(`"Sikandar Abbas — SK Blog" with a link to the article is appreciated.`);
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
