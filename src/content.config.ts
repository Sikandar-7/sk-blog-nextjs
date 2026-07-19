import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    /** Hidden from listings and marked noindex until flipped to false */
    draft: z.boolean().default(false),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Sikandar Abbas'),
    /** Optional hero image path under /public */
    cover: z.string().optional(),
    /** Pin to the top of the homepage */
    featured: z.boolean().default(false),
  }),
});

export const collections = { posts };
