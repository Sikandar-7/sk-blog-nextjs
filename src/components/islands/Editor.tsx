import { useState, useEffect, useRef, useMemo, useCallback } from 'preact/hooks';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { getSupabase, slugify, readingMinutes } from '../../lib/supabase';

const CATEGORIES = ['Engineering', 'Security', 'Architecture', 'Career', 'General'];
const DRAFT_KEY = 'sk-blog:draft';

type View = 'write' | 'preview' | 'split';

interface Toolbar {
  label: string;
  title: string;
  /** wraps selection, or inserts at the line start when `block` is true */
  before: string;
  after?: string;
  block?: boolean;
  key?: string;
}

const TOOLS: Toolbar[] = [
  { label: 'B', title: 'Bold (Ctrl+B)', before: '**', after: '**', key: 'b' },
  { label: 'I', title: 'Italic (Ctrl+I)', before: '_', after: '_', key: 'i' },
  { label: 'H2', title: 'Heading', before: '## ', block: true },
  { label: 'H3', title: 'Sub-heading', before: '### ', block: true },
  { label: '“ ”', title: 'Quote', before: '> ', block: true },
  { label: '• List', title: 'Bulleted list', before: '- ', block: true },
  { label: '1. List', title: 'Numbered list', before: '1. ', block: true },
  { label: '</>', title: 'Inline code', before: '`', after: '`' },
  { label: '{ }', title: 'Code block', before: '```ts\n', after: '\n```', block: false },
  { label: '🔗', title: 'Link (Ctrl+K)', before: '[', after: '](https://)', key: 'k' },
  { label: '🖼', title: 'Image', before: '![alt](', after: ')' },
];

export default function Editor() {
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('Engineering');
  const [coverUrl, setCoverUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [content, setContent] = useState('');

  const [view, setView] = useState<View>('write');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const supabase = getSupabase();

  /* ── session ─────────────────────────────────────────── */
  useEffect(() => {
    if (!supabase) return setChecking(false);
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return (window.location.href = '/login');
      setUserId(data.user.id);
      setChecking(false);
    });
  }, []);

  /* ── local draft recovery: never lose writing to a stray refresh ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.content || d.title) {
        setTitle(d.title ?? '');
        setContent(d.content ?? '');
        setExcerpt(d.excerpt ?? '');
        setCategory(d.category ?? 'Engineering');
        setCoverUrl(d.coverUrl ?? '');
        setTagsInput(d.tagsInput ?? '');
        setNotice('Recovered your unsaved draft from this browser.');
      }
    } catch {
      /* ignore malformed local draft */
    }
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ title, content, excerpt, category, coverUrl, tagsInput })
        );
        setSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch {
        /* storage full or blocked — autosave is a convenience, not a guarantee */
      }
    }, 800);
    return () => clearTimeout(t);
  }, [title, content, excerpt, category, coverUrl, tagsInput, dirty]);

  /* ── warn before leaving with unsaved work ───────────── */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    };
    addEventListener('beforeunload', handler);
    return () => removeEventListener('beforeunload', handler);
  }, [dirty]);

  /* ── stats ───────────────────────────────────────────── */
  const stats = useMemo(() => {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    return { words, chars: content.length, minutes: readingMinutes(content) };
  }, [content]);

  const html = useMemo(() => {
    if (view === 'write') return '';
    try {
      const raw = marked.parse(content || '_Nothing to preview yet._', { async: false }) as string;
      // The preview renders text that other people will eventually read, so it
      // goes through a sanitizer rather than straight into innerHTML.
      return DOMPurify.sanitize(raw);
    } catch {
      return '<p>Could not render preview.</p>';
    }
  }, [content, view]);

  /* ── toolbar / shortcuts ─────────────────────────────── */
  const applyTool = useCallback(
    (tool: Toolbar) => {
      const el = areaRef.current;
      if (!el) return;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const selected = content.slice(start, end);

      let next: string;
      let cursor: number;

      if (tool.block) {
        const lineStart = content.lastIndexOf('\n', start - 1) + 1;
        next = content.slice(0, lineStart) + tool.before + content.slice(lineStart);
        cursor = end + tool.before.length;
      } else {
        const after = tool.after ?? '';
        next = content.slice(0, start) + tool.before + selected + after + content.slice(end);
        cursor = selected ? start + tool.before.length + selected.length + after.length : start + tool.before.length;
      }

      setContent(next);
      setDirty(true);
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    },
    [content]
  );

  function onKeyDown(e: KeyboardEvent) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === 's') {
      e.preventDefault();
      save('draft');
      return;
    }
    const tool = TOOLS.find((t) => t.key === k);
    if (tool) {
      e.preventDefault();
      applyTool(tool);
    }
  }

  /* ── save ────────────────────────────────────────────── */
  async function save(status: 'draft' | 'published') {
    setError(null);
    setNotice(null);
    if (!supabase || !userId) return setError('You need to be signed in.');
    if (title.trim().length < 4) return setError('Give the article a title first.');
    if (content.trim().length < 50) return setError('The article is still very short.');

    setBusy(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 6);

      const { error } = await supabase.from('posts').insert({
        author_id: userId,
        slug: `${slugify(title)}-${Date.now().toString(36).slice(-4)}`,
        title: title.trim(),
        excerpt: excerpt.trim() || content.trim().replace(/[#*_`>]/g, '').slice(0, 160),
        content,
        cover_url: coverUrl.trim() || null,
        category,
        tags,
        status,
        reading_minutes: stats.minutes,
        published_at: status === 'published' ? new Date().toISOString() : null,
      });
      if (error) throw error;

      localStorage.removeItem(DRAFT_KEY);
      setDirty(false);
      setNotice(
        status === 'published'
          ? 'Published. It appears on the site once the next build finishes (about a minute).'
          : 'Draft saved to your account.'
      );
      if (status === 'published') setTimeout(() => (window.location.href = '/dashboard'), 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (checking) return <p class="py-16 text-center text-muted">Checking your session…</p>;
  if (!supabase)
    return <p class="py-16 text-center text-muted">Writing is not configured on this deployment yet.</p>;

  const field =
    'w-full rounded-xl bg-surface-2 border border-border px-4 py-3 text-fg placeholder:text-muted focus:border-primary focus:outline-none transition-colors';

  return (
    <div class="flex flex-col gap-5">
      {error && (
        <p role="alert" class="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" class="rounded-xl border border-secondary/40 bg-secondary/10 px-4 py-3 text-sm text-secondary">
          {notice}
        </p>
      )}

      {/* Title */}
      <input
        class="w-full border-none bg-transparent px-0 py-2 font-display text-3xl font-extrabold tracking-tight text-fg placeholder:text-muted/50 focus:outline-none sm:text-4xl"
        placeholder="Article title"
        value={title}
        onInput={(e) => {
          setTitle((e.target as HTMLInputElement).value);
          setDirty(true);
        }}
      />

      {/* Meta row */}
      <div class="grid gap-3 sm:grid-cols-3">
        <select
          class={field}
          value={category}
          onChange={(e) => {
            setCategory((e.target as HTMLSelectElement).value);
            setDirty(true);
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          class={field}
          placeholder="tags, comma, separated"
          value={tagsInput}
          onInput={(e) => {
            setTagsInput((e.target as HTMLInputElement).value);
            setDirty(true);
          }}
        />
        <input
          class={field}
          placeholder="Cover image URL"
          value={coverUrl}
          onInput={(e) => {
            setCoverUrl((e.target as HTMLInputElement).value);
            setDirty(true);
          }}
        />
      </div>

      {coverUrl && (
        <img
          src={coverUrl}
          alt=""
          class="h-44 w-full rounded-xl border border-border object-cover"
          onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
        />
      )}

      <textarea
        class={`${field} min-h-16 resize-none`}
        placeholder="One-line summary for the article card (optional)"
        value={excerpt}
        onInput={(e) => {
          setExcerpt((e.target as HTMLTextAreaElement).value);
          setDirty(true);
        }}
      />

      {/* Toolbar */}
      <div class="sticky top-16 z-20 flex flex-wrap items-center gap-1 rounded-xl border border-border bg-surface/95 p-2 backdrop-blur">
        {TOOLS.map((t) => (
          <button
            key={t.label}
            type="button"
            title={t.title}
            onClick={() => applyTool(t)}
            class="rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold text-muted transition hover:bg-surface-2 hover:text-primary"
          >
            {t.label}
          </button>
        ))}

        <div class="ml-auto flex items-center gap-1 rounded-lg bg-surface-2 p-1">
          {(['write', 'split', 'preview'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              class={`rounded-md px-3 py-1 text-xs font-bold capitalize transition ${
                view === v ? 'bg-primary text-white' : 'text-muted hover:text-fg'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Write / preview */}
      <div class={view === 'split' ? 'grid gap-4 lg:grid-cols-2' : ''}>
        {view !== 'preview' && (
          <textarea
            ref={areaRef}
            class={`${field} min-h-[26rem] resize-y font-mono text-sm leading-7`}
            placeholder={'# Your heading\n\nStart writing…\n\nSelect text and use the toolbar, or press Ctrl+B / Ctrl+I / Ctrl+K.'}
            value={content}
            onKeyDown={onKeyDown}
            onInput={(e) => {
              setContent((e.target as HTMLTextAreaElement).value);
              setDirty(true);
            }}
          />
        )}
        {view !== 'write' && (
          <div
            class="prose min-h-[26rem] overflow-auto rounded-xl border border-border bg-surface p-6"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>

      {/* Status bar */}
      <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>
          {stats.words} words · {stats.chars} characters · {stats.minutes} min read
        </span>
        <span>
          {savedAt ? `Autosaved locally at ${savedAt}` : dirty ? 'Unsaved changes' : 'Markdown supported'}
        </span>
      </div>

      {/* Actions */}
      <div class="flex flex-wrap gap-3 border-t border-border pt-5">
        <button
          type="button"
          disabled={busy}
          onClick={() => save('published')}
          class="rounded-xl bg-primary px-6 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? 'Saving…' : 'Publish'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => save('draft')}
          class="rounded-xl border border-border px-6 py-3 font-bold transition hover:border-primary hover:text-primary disabled:opacity-60"
        >
          Save draft <span class="ml-1 font-mono text-xs text-muted">Ctrl+S</span>
        </button>
        <a
          href="/dashboard"
          class="ml-auto self-center text-sm text-muted transition hover:text-primary"
        >
          ← Back to dashboard
        </a>
      </div>
    </div>
  );
}
