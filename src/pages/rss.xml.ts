import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPublishedPosts } from '../lib/posts';

export async function GET(context: APIContext) {
  const posts = await getPublishedPosts();

  return rss({
    title: 'SK Blog',
    description:
      'Practical writing on web development — Next.js, Astro, TypeScript and the craft of shipping software.',
    site: context.site ?? 'https://sk-blog-nextjs-8fw1.vercel.app',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.publishedAt,
      categories: [post.data.category, ...post.data.tags],
      author: post.data.author,
      link: `/blog/${post.id}/`,
    })),
    customData: '<language>en</language>',
  });
}
