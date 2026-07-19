import { useState, useEffect } from 'preact/hooks';
import { getSupabase } from '../../lib/supabase';

interface CommentRow {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles?: { username: string; full_name: string | null; avatar_url: string | null } | null;
}

interface Props {
  slug: string;
}

export default function Comments({ slug }: Props) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabase();

  async function load() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('comments')
      .select('id, body, created_at, author_id, profiles(username, full_name, avatar_url)')
      .eq('post_slug', slug)
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setComments((data as unknown as CommentRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    load();
  }, [slug]);

  async function submit(e: Event) {
    e.preventDefault();
    if (!supabase || !userId) return;
    if (body.trim().length < 2) return;

    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from('comments')
      .insert({ post_slug: slug, author_id: userId, body: body.trim() });
    if (error) setError(error.message);
    else {
      setBody('');
      await load();
    }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) setError(error.message);
    else setComments((c) => c.filter((x) => x.id !== id));
  }

  if (!supabase) return null;

  return (
    <section class="mt-16 border-t border-border pt-10">
      <h2 class="mb-6 font-display text-2xl font-bold">
        Comments {comments.length > 0 && <span class="text-muted">({comments.length})</span>}
      </h2>

      {error && (
        <p role="alert" class="mb-4 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
          {error}
        </p>
      )}

      {userId ? (
        <form onSubmit={submit} class="mb-8 flex flex-col gap-3">
          <textarea
            class="min-h-28 w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-fg placeholder:text-muted focus:border-primary focus:outline-none"
            placeholder="Share what you think…"
            value={body}
            maxLength={2000}
            onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)}
          />
          <button
            type="submit"
            disabled={busy || body.trim().length < 2}
            class="self-start rounded-xl bg-primary px-5 py-2.5 font-bold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      ) : (
        <p class="mb-8 rounded-xl border border-border bg-surface px-5 py-4 text-sm text-muted">
          <a href="/login" class="font-semibold text-primary hover:underline">
            Sign in
          </a>{' '}
          to join the conversation.
        </p>
      )}

      {loading ? (
        <p class="text-muted">Loading comments…</p>
      ) : comments.length === 0 ? (
        <p class="text-muted">No comments yet — be the first.</p>
      ) : (
        <ul class="flex flex-col gap-5">
          {comments.map((c) => {
            const name = c.profiles?.full_name || c.profiles?.username || 'Reader';
            return (
              <li key={c.id} class="rounded-2xl border border-border bg-surface px-5 py-4">
                <div class="mb-2 flex items-center justify-between gap-3">
                  <div class="flex items-center gap-3">
                    <span class="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-xs font-bold">
                      {name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p class="text-sm font-bold">{name}</p>
                      <p class="text-xs text-muted">
                        {new Date(c.created_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  {userId === c.author_id && (
                    <button
                      onClick={() => remove(c.id)}
                      class="text-xs text-muted transition hover:text-primary"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <p class="whitespace-pre-wrap text-sm leading-relaxed">{c.body}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
