import { useState, useEffect } from 'preact/hooks';
import { getSupabase, type DbPost } from '../../lib/supabase';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<DbPost[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        window.location.href = '/login';
        return;
      }
      setEmail(auth.user.email ?? null);

      // RLS limits this to the signed-in author's own rows, drafts included
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('author_id', auth.user.id)
        .order('created_at', { ascending: false });

      if (error) setError(error.message);
      else setPosts((data as DbPost[]) ?? []);
      setLoading(false);
    })();
  }, []);

  async function signOut() {
    await supabase?.auth.signOut();
    window.location.href = '/';
  }

  async function remove(id: string) {
    if (!supabase || !confirm('Delete this article? This cannot be undone.')) return;
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) setError(error.message);
    else setPosts((p) => p.filter((x) => x.id !== id));
  }

  if (loading) return <p class="py-16 text-center text-muted">Loading your articles…</p>;
  if (!supabase)
    return <p class="py-16 text-center text-muted">Accounts are not configured on this deployment yet.</p>;

  return (
    <div class="flex flex-col gap-8">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <p class="text-sm text-muted">
          Signed in as <span class="font-semibold text-fg">{email}</span>
        </p>
        <div class="flex gap-3">
          <a
            href="/write"
            class="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
          >
            New article
          </a>
          <button
            onClick={signOut}
            class="rounded-xl border border-border px-5 py-2.5 text-sm font-bold transition hover:border-primary hover:text-primary"
          >
            Sign out
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" class="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
          {error}
        </p>
      )}

      {posts.length === 0 ? (
        <div class="rounded-2xl border border-border bg-surface px-6 py-16 text-center">
          <p class="mb-2 text-lg font-bold">Nothing written yet</p>
          <p class="mb-6 text-muted">Your first article is the hardest. After that it gets easier.</p>
          <a
            href="/write"
            class="inline-block rounded-xl bg-primary px-6 py-3 font-bold text-white transition hover:opacity-90"
          >
            Start writing
          </a>
        </div>
      ) : (
        <ul class="flex flex-col gap-3">
          {posts.map((p) => (
            <li
              key={p.id}
              class="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-5 py-4"
            >
              <div class="min-w-0">
                <div class="mb-1 flex items-center gap-2">
                  <span
                    class={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                      p.status === 'published'
                        ? 'bg-secondary/15 text-secondary'
                        : 'bg-muted/15 text-muted'
                    }`}
                  >
                    {p.status}
                  </span>
                  <span class="text-xs text-muted">{p.category}</span>
                </div>
                <p class="truncate font-bold">{p.title}</p>
              </div>
              <div class="flex gap-2">
                {p.status === 'published' && (
                  <a
                    href={`/blog/${p.slug}`}
                    class="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:border-primary hover:text-primary"
                  >
                    View
                  </a>
                )}
                <button
                  onClick={() => remove(p.id)}
                  class="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:border-primary hover:text-primary"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
