import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

const isPublished = (p: Post) => import.meta.env.DEV || !p.data.draft;

/** Newest first, drafts hidden in production. */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', isPublished);
  return posts.sort(
    (a, b) => b.data.publishedAt.getTime() - a.data.publishedAt.getTime()
  );
}

export async function getFeaturedPost(): Promise<Post | undefined> {
  const posts = await getPublishedPosts();
  return posts.find((p) => p.data.featured) ?? posts[0];
}

export async function getCategories(): Promise<{ name: string; count: number }[]> {
  const posts = await getPublishedPosts();
  const map = new Map<string, number>();
  posts.forEach((p) => map.set(p.data.category, (map.get(p.data.category) ?? 0) + 1));
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

/** Same category first, then most recent. */
export async function getRelatedPosts(current: Post, limit = 3): Promise<Post[]> {
  const posts = (await getPublishedPosts()).filter((p) => p.id !== current.id);
  return posts
    .sort((a, b) => {
      const aScore = a.data.category === current.data.category ? 1 : 0;
      const bScore = b.data.category === current.data.category ? 1 : 0;
      if (aScore !== bScore) return bScore - aScore;
      return b.data.publishedAt.getTime() - a.data.publishedAt.getTime();
    })
    .slice(0, limit);
}

/** ~200 wpm, the usual reading-time assumption. */
export function readingTime(body: string): number {
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
