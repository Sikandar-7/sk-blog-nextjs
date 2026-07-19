import { useState, useEffect } from 'preact/hooks';
import { getSupabase, slugify, readingMinutes } from '../../lib/supabase';

const CATEGORIES = ['Engineering', 'Security', 'Architecture', 'Career', 'General'];

export default function Editor() {
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [category, setCategory] = useState('Engineering');
  const [coverUrl, setCoverUrl] = useState('');
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) {
      setChecking(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = '/login';
        return;
      }
      setUserId(data.user.id);
      setChecking(false);
    });
  }, []);

  async function save(status: 'draft' | 'published') {
    setError(null);
    setNotice(null);

    if (!supabase || !userId) return setError('You need to be signed in.');
    if (title.trim().length < 4) return setError('Give the article a title first.');
    if (content.trim().length < 50) return setError('The article is still very short.');

    setBusy(true);
    try {
      const { error } = await supabase.from('posts').insert({
        author_id: userId,
        slug: `${slugify(title)}-${Date.now().toString(36).slice(-4)}`,
        title: title.trim(),
        excerpt: excerpt.trim() || content.trim().slice(0, 160),
        content,
        cover_url: coverUrl.trim() || null,
        category,
        status,
        reading_minutes: readingMinutes(content),
        published_at: status === 'published' ? new Date().toISOString() : null,
      });
      if (error) throw error;

      setNotice(
        status === 'published'
          ? 'Published. It appears on the site once the next build finishes (about a minute).'
          : 'Draft saved.'
      );
      if (status === 'published') setTimeout(() => (window.location.href = '/dashboard'), 1500);
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

      <input
        class={`${field} font-display text-2xl font-bold`}
        placeholder="Article title"
        value={title}
        onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
      />

      <div class="grid gap-4 sm:grid-cols-2">
        <select
          class={field}
          value={category}
          onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          class={field}
          placeholder="Cover image URL (optional)"
          value={coverUrl}
          onInput={(e) => setCoverUrl((e.target as HTMLInputElement).value)}
        />
      </div>

      <textarea
        class={`${field} min-h-20`}
        placeholder="One-line summary shown on the article card (optional)"
        value={excerpt}
        onInput={(e) => setExcerpt((e.target as HTMLTextAreaElement).value)}
      />

      <div class="flex items-center justify-between">
        <span class="text-sm text-muted">
          Markdown supported · {readingMinutes(content)} min read
        </span>
        <button
          type="button"
          onClick={() => setPreview(!preview)}
          class="rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition hover:border-primary hover:text-primary"
        >
          {preview ? 'Write' : 'Preview'}
        </button>
      </div>

      {preview ? (
        <div class="prose min-h-[24rem] rounded-xl border border-border bg-surface p-6">
          {content.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      ) : (
        <textarea
          class={`${field} min-h-[24rem] font-mono text-sm leading-7`}
          placeholder={'# Your heading\n\nStart writing…'}
          value={content}
          onInput={(e) => setContent((e.target as HTMLTextAreaElement).value)}
        />
      )}

      <div class="flex flex-wrap gap-3">
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
          Save draft
        </button>
      </div>
    </div>
  );
}
