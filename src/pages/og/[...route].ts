import { OGImageRoute } from 'astro-og-canvas';
import { getPublishedPosts } from '../../lib/posts';

/**
 * Generates a share card per article at build time, so a link posted to
 * LinkedIn or WhatsApp shows the article's title rather than nothing.
 *
 * Colours match the site's dark theme and brand orange.
 */
const posts = await getPublishedPosts();

const pages = Object.fromEntries(
  posts.map((post) => [
    post.id,
    {
      title: post.data.title,
      description: post.data.description,
      category: post.data.category,
    },
  ])
);

// v0.13 returns a promise, and infers the route parameter from the filename.
export const { getStaticPaths, GET } = await OGImageRoute({
  pages,
  getImageOptions: (_path, page: (typeof pages)[string]) => ({
    title: page.title,
    description: page.description,
    logo: undefined,
    bgGradient: [
      [12, 12, 12],
      [24, 18, 16],
    ],
    border: {
      color: [255, 87, 51],
      width: 12,
      side: 'inline-start',
    },
    padding: 70,
    font: {
      title: {
        size: 62,
        lineHeight: 1.15,
        weight: 'ExtraBold',
        color: [255, 255, 255],
        families: ['Sora', 'Inter'],
      },
      description: {
        size: 28,
        lineHeight: 1.5,
        weight: 'Normal',
        color: [165, 165, 165],
        families: ['Inter'],
      },
    },
    fonts: [
      'https://api.fontsource.org/v1/fonts/sora/latin-800-normal.ttf',
      'https://api.fontsource.org/v1/fonts/inter/latin-400-normal.ttf',
    ],
  }),
});
