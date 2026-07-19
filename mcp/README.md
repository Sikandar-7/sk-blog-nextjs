# SK Blog — MCP server

Lets an assistant write and publish articles on the blog by talking to this
repo directly. Articles are MDX files, so writing one is a file write and
publishing is a `git push` that Vercel builds.

## Install

```bash
cd mcp
npm install
```

## Register with Claude Code

```bash
claude mcp add --scope user sk-blog -- node "C:/Users/sikan/Desktop/web_sk/blog/nextjs-blog/mcp/server.mjs"
```

Then restart Claude Code and ask it to `list_articles` to confirm the
connection.

## Tools

| Tool | What it does |
| --- | --- |
| `list_articles` | Every article with slug, category, date, word count, draft flag |
| `read_article` | Full frontmatter and markdown for one article |
| `create_article` | Writes a new `.mdx` file — **local only** |
| `update_article` | Edits the body and/or frontmatter of an existing article |
| `delete_article` | Removes an article; requires `confirm: true` |
| `preview_status` | Shows what is uncommitted, i.e. what would go live |
| `publish_site` | Commits and pushes, which triggers the Vercel build |

## Why creating and publishing are separate

`create_article` never pushes. Drafting an article and putting it on a public
website are different decisions, and the second one should be deliberate. The
normal flow is:

1. `create_article` — the file lands in `src/content/posts/`
2. read it, edit it, run the site locally if you want
3. `preview_status` — see exactly what will change
4. `publish_site` — now it is public

## Notes

- No secrets are required. The server only touches this repo and `git`, so
  there is no Supabase key involved and nothing to leak.
- `SK_BLOG_REPO` can override the repo path if the server is run from
  somewhere unusual.
- Article slugs are sanitised and every write is confined to
  `src/content/posts/`.
