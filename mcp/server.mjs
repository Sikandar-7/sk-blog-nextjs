#!/usr/bin/env node
/**
 * SK Blog — MCP server
 *
 * Lets an assistant draft, edit and publish articles on the blog.
 *
 * Articles are MDX files in the repo, so writing one is a file write and
 * publishing is a git push that Vercel picks up. Creating and publishing are
 * deliberately separate tools: drafting should never put something on a public
 * site as a side effect.
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const run = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Repo root = the folder above mcp/. Overridable for unusual checkouts. */
const REPO = process.env.SK_BLOG_REPO ? path.resolve(process.env.SK_BLOG_REPO) : path.resolve(__dirname, '..');
const POSTS_DIR = path.join(REPO, 'src', 'content', 'posts');
const SITE = 'https://sk-blog-nextjs-8fw1.vercel.app';

const CATEGORIES = ['Engineering', 'Security', 'Architecture', 'Career', 'General'];

/* ── helpers ─────────────────────────────────────────────── */

const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);

/** Keep every path inside the posts directory. */
function postPath(slug) {
  const clean = slugify(slug);
  if (!clean) throw new Error('Invalid slug.');
  const p = path.join(POSTS_DIR, `${clean}.mdx`);
  if (!p.startsWith(POSTS_DIR)) throw new Error('Refusing to write outside the posts directory.');
  return p;
}

const ok = (text) => ({ content: [{ type: 'text', text }] });
const fail = (text) => ({ content: [{ type: 'text', text }], isError: true });

function frontmatter(data) {
  const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
  const lines = [
    `title: ${q(data.title)}`,
    `description: ${q(data.description)}`,
    `publishedAt: ${data.publishedAt}`,
    `category: ${q(data.category)}`,
    `tags: [${(data.tags ?? []).map(q).join(', ')}]`,
  ];
  if (data.updatedAt) lines.push(`updatedAt: ${data.updatedAt}`);
  if (data.cover) lines.push(`cover: ${q(data.cover)}`);
  if (data.featured) lines.push('featured: true');
  if (data.draft) lines.push('draft: true');
  return `---\n${lines.join('\n')}\n---\n`;
}

async function listPosts() {
  if (!existsSync(POSTS_DIR)) return [];
  const files = (await readdir(POSTS_DIR)).filter((f) => /\.mdx?$/.test(f));
  const out = [];
  for (const file of files) {
    const raw = await readFile(path.join(POSTS_DIR, file), 'utf8');
    const { data, content } = matter(raw);
    out.push({
      slug: file.replace(/\.mdx?$/, ''),
      title: data.title ?? '(untitled)',
      category: data.category ?? '—',
      publishedAt: data.publishedAt instanceof Date ? data.publishedAt.toISOString().slice(0, 10) : String(data.publishedAt ?? ''),
      draft: Boolean(data.draft),
      featured: Boolean(data.featured),
      words: content.trim().split(/\s+/).filter(Boolean).length,
    });
  }
  return out.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

async function git(args) {
  const { stdout, stderr } = await run('git', args, { cwd: REPO, maxBuffer: 1024 * 1024 });
  return (stdout || stderr || '').trim();
}

/* ── tools ───────────────────────────────────────────────── */

const TOOLS = [
  {
    name: 'list_articles',
    description: 'List every article in the blog with its slug, category, date, draft status and word count.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'read_article',
    description: 'Read one article, returning its frontmatter and full markdown body.',
    inputSchema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'Article slug, e.g. why-your-backend-died' } },
      required: ['slug'],
    },
  },
  {
    name: 'create_article',
    description:
      'Create a new article as an MDX file. This only writes the file locally — call publish_site afterwards to put it on the web.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string', description: 'One or two sentences shown on cards and in search results.' },
        content: { type: 'string', description: 'Article body in markdown. Do not repeat the title as an H1.' },
        category: { type: 'string', enum: CATEGORIES },
        tags: { type: 'array', items: { type: 'string' }, description: 'Up to about five lowercase tags.' },
        slug: { type: 'string', description: 'Optional. Derived from the title when omitted.' },
        publishedAt: { type: 'string', description: 'YYYY-MM-DD. Defaults to today.' },
        featured: { type: 'boolean', description: 'Pin to the top of the homepage.' },
        draft: { type: 'boolean', description: 'Keep it hidden from listings.' },
        cover: { type: 'string', description: 'Optional image path under /public.' },
      },
      required: ['title', 'description', 'content', 'category'],
    },
  },
  {
    name: 'update_article',
    description: 'Replace the body and/or frontmatter fields of an existing article.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string' },
        content: { type: 'string', description: 'New markdown body. Omit to keep the current body.' },
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string', enum: CATEGORIES },
        tags: { type: 'array', items: { type: 'string' } },
        featured: { type: 'boolean' },
        draft: { type: 'boolean' },
      },
      required: ['slug'],
    },
  },
  {
    name: 'delete_article',
    description: 'Delete an article file. Requires confirm: true so it cannot happen by accident.',
    inputSchema: {
      type: 'object',
      properties: { slug: { type: 'string' }, confirm: { type: 'boolean' } },
      required: ['slug', 'confirm'],
    },
  },
  {
    name: 'preview_status',
    description: 'Show uncommitted changes in the blog repo — what would go live on the next publish.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'publish_site',
    description:
      'Commit the current article changes and push to GitHub, which triggers a Vercel build. This makes the work publicly visible.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message describing what was written.' },
      },
      required: ['message'],
    },
  },
];

/* ── server ──────────────────────────────────────────────── */

const server = new Server({ name: 'sk-blog', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name } = req.params;
  const a = req.params.arguments ?? {};

  try {
    switch (name) {
      case 'list_articles': {
        const posts = await listPosts();
        if (posts.length === 0) return ok('No articles yet.');
        const lines = posts.map(
          (p) =>
            `• ${p.title}\n  slug: ${p.slug} · ${p.category} · ${p.publishedAt} · ${p.words} words` +
            `${p.draft ? ' · DRAFT' : ''}${p.featured ? ' · featured' : ''}\n  ${SITE}/blog/${p.slug}/`
        );
        return ok(`${posts.length} article(s):\n\n${lines.join('\n\n')}`);
      }

      case 'read_article': {
        const file = postPath(a.slug);
        if (!existsSync(file)) return fail(`No article with slug "${a.slug}".`);
        return ok(await readFile(file, 'utf8'));
      }

      case 'create_article': {
        const slug = slugify(a.slug || a.title);
        const file = postPath(slug);
        if (existsSync(file)) return fail(`"${slug}" already exists. Use update_article, or pick another slug.`);
        if (!CATEGORIES.includes(a.category)) return fail(`Category must be one of: ${CATEGORIES.join(', ')}`);

        const fm = frontmatter({
          title: a.title,
          description: a.description,
          publishedAt: a.publishedAt || new Date().toISOString().slice(0, 10),
          category: a.category,
          tags: a.tags ?? [],
          featured: a.featured,
          draft: a.draft,
          cover: a.cover,
        });

        await writeFile(file, `${fm}\n${String(a.content).trim()}\n`, 'utf8');
        const words = String(a.content).trim().split(/\s+/).length;
        return ok(
          `Created "${a.title}" (${words} words) at src/content/posts/${slug}.mdx.\n` +
            `It is not online yet — call publish_site when you want it live.`
        );
      }

      case 'update_article': {
        const file = postPath(a.slug);
        if (!existsSync(file)) return fail(`No article with slug "${a.slug}".`);
        const { data, content } = matter(await readFile(file, 'utf8'));

        const merged = {
          ...data,
          ...(a.title !== undefined && { title: a.title }),
          ...(a.description !== undefined && { description: a.description }),
          ...(a.category !== undefined && { category: a.category }),
          ...(a.tags !== undefined && { tags: a.tags }),
          ...(a.featured !== undefined && { featured: a.featured }),
          ...(a.draft !== undefined && { draft: a.draft }),
          publishedAt:
            data.publishedAt instanceof Date ? data.publishedAt.toISOString().slice(0, 10) : data.publishedAt,
          updatedAt: new Date().toISOString().slice(0, 10),
        };

        const body = a.content !== undefined ? String(a.content).trim() : content.trim();
        await writeFile(file, `${frontmatter(merged)}\n${body}\n`, 'utf8');
        return ok(`Updated "${merged.title}". Call publish_site to push the change live.`);
      }

      case 'delete_article': {
        if (a.confirm !== true) return fail('Pass confirm: true to delete an article.');
        const file = postPath(a.slug);
        if (!existsSync(file)) return fail(`No article with slug "${a.slug}".`);
        await unlink(file);
        return ok(`Deleted ${a.slug}.mdx. Call publish_site to remove it from the live site.`);
      }

      case 'preview_status': {
        const status = await git(['status', '--short']);
        return ok(status ? `Uncommitted changes:\n\n${status}` : 'Nothing to publish — the repo is clean.');
      }

      case 'publish_site': {
        const status = await git(['status', '--short']);
        if (!status) return ok('Nothing to publish — the repo is clean.');

        await git(['add', '-A']);
        await git(['commit', '-m', String(a.message)]);
        await git(['push', 'origin', 'main']);
        const head = await git(['log', '--oneline', '-1']);

        return ok(
          `Pushed: ${head}\n\nVercel is building now; the article is usually live in about a minute at ${SITE}/blog/`
        );
      }

      default:
        return fail(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return fail(`${name} failed: ${err instanceof Error ? err.message : String(err)}`);
  }
});

await server.connect(new StdioServerTransport());
console.error(`sk-blog MCP server ready — repo: ${REPO}`);
