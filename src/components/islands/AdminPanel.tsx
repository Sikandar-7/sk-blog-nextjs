import { useState, useEffect, useMemo } from 'preact/hooks';
import { getSupabase } from '../../lib/supabase';

type Tab = 'users' | 'posts' | 'comments';

interface AdminUser {
  id: string;
  username: string;
  full_name: string | null;
  email: string | null;
  role: 'reader' | 'writer' | 'admin';
  banned: boolean;
  created_at: string;
  post_count: number;
  comment_count: number;
}

interface AdminPost {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: 'draft' | 'published';
  created_at: string;
  author_id: string;
}

interface AdminComment {
  id: string;
  post_slug: string;
  body: string;
  created_at: string;
  author_id: string;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export default function AdminPanel() {
  const [state, setState] = useState<'checking' | 'denied' | 'ready'>('checking');
  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const supabase = getSupabase();

  useEffect(() => {
    if (!supabase) return setState('denied');
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return (window.location.href = '/login');

      // Authority is the database, not this check — RLS returns nothing to
      // a non-admin even if someone forces their way onto this page.
      const { data: me } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', auth.user.id)
        .single();

      if (me?.role !== 'admin') return setState('denied');
      setState('ready');
      void loadAll();
    })();
  }, []);

  async function loadAll() {
    if (!supabase) return;
    const [u, p, c] = await Promise.all([
      supabase.from('admin_users').select('*'),
      supabase.from('posts').select('id,slug,title,category,status,created_at,author_id').order('created_at', { ascending: false }),
      supabase.from('comments').select('id,post_slug,body,created_at,author_id').order('created_at', { ascending: false }).limit(100),
    ]);
    if (u.error || p.error || c.error) setError(u.error?.message ?? p.error?.message ?? c.error?.message ?? null);
    setUsers((u.data as AdminUser[]) ?? []);
    setPosts((p.data as AdminPost[]) ?? []);
    setComments((c.data as AdminComment[]) ?? []);
  }

  /** One call so an account can never end up half-approved. */
  async function grant(id: string, patch: Partial<Pick<AdminUser, 'role' | 'banned'>>) {
    if (!supabase) return;
    const { error } = await supabase.from('profiles').update(patch).eq('id', id);
    if (error) return setError(error.message);
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  // Accounts arrive blocked, so approving means lifting the block *and*
  // giving the role in the same update.
  const approveWriter = (id: string) => grant(id, { banned: false, role: 'writer' });
  const approveReader = (id: string) => grant(id, { banned: false, role: 'reader' });
  const block = (id: string) => grant(id, { banned: true });

  async function removePost(id: string) {
    if (!supabase || !confirm('Delete this article permanently?')) return;
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) return setError(error.message);
    setPosts((l) => l.filter((p) => p.id !== id));
  }

  async function removeComment(id: string) {
    if (!supabase || !confirm('Delete this comment?')) return;
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) return setError(error.message);
    setComments((l) => l.filter((c) => c.id !== id));
  }

  const shownUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q) ||
        (u.full_name ?? '').toLowerCase().includes(q)
    );
  }, [users, query]);

  const nameOf = (id: string) => users.find((u) => u.id === id)?.username ?? 'unknown';

  if (state === 'checking') return <p class="py-20 text-center text-muted">Checking access…</p>;

  if (state === 'denied')
    return (
      <div class="rounded-2xl border border-border bg-surface px-6 py-16 text-center">
        <p class="mb-2 text-lg font-bold">Admins only</p>
        <p class="mb-6 text-muted">This area is restricted. If that seems wrong, ask an admin to grant you access.</p>
        <a href="/" class="inline-block rounded-xl bg-primary px-6 py-3 font-bold text-white">
          Back to the blog
        </a>
      </div>
    );

  const pending = users.filter((u) => u.banned).length;
  const stats = [
    { label: 'Users', value: users.length },
    { label: 'Awaiting approval', value: pending },
    { label: 'Articles', value: posts.length },
    { label: 'Comments', value: comments.length },
  ];

  const pill = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-bold capitalize transition ${
      active ? 'bg-primary text-white' : 'text-muted hover:text-fg'
    }`;

  return (
    <div class="flex flex-col gap-7">
      {error && (
        <p role="alert" class="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary">
          {error}
        </p>
      )}

      {/* Stats */}
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} class="rounded-2xl border border-border bg-surface px-5 py-4">
            <p class="font-display text-3xl font-extrabold">{s.value}</p>
            <p class="mt-1 text-xs uppercase tracking-wide text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div class="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-1.5">
        {(['users', 'posts', 'comments'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} class={pill(tab === t)}>
            {t}
          </button>
        ))}
        {tab === 'users' && (
          <input
            class="ml-auto min-w-48 flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            placeholder="Search name or email…"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
          />
        )}
      </div>

      {/* USERS */}
      {tab === 'users' && (
        <div class="overflow-x-auto rounded-2xl border border-border">
          <table class="w-full min-w-[46rem] text-sm">
            <thead class="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th class="px-4 py-3">User</th>
                <th class="px-4 py-3">Email</th>
                <th class="px-4 py-3">Role</th>
                <th class="px-4 py-3">Joined</th>
                <th class="px-4 py-3">Posts</th>
                <th class="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shownUsers.map((u) => (
                <tr key={u.id} class="border-t border-border">
                  <td class="px-4 py-3">
                    <p class="font-bold">{u.full_name || u.username}</p>
                    <p class="text-xs text-muted">@{u.username}</p>
                  </td>
                  <td class="px-4 py-3 text-muted">{u.email ?? '—'}</td>
                  <td class="px-4 py-3">
                    <span
                      class={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
                        u.banned
                          ? 'bg-primary/15 text-primary'
                          : u.role === 'admin'
                            ? 'bg-secondary/15 text-secondary'
                            : u.role === 'writer'
                              ? 'bg-fg/10 text-fg'
                              : 'bg-muted/15 text-muted'
                      }`}
                    >
                      {/* A blocked account that has never been approved is
                          waiting, not punished — say so. */}
                      {u.banned ? (u.role === 'reader' ? 'pending' : 'blocked') : u.role}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-muted">{fmt(u.created_at)}</td>
                  <td class="px-4 py-3 text-muted">{u.post_count}</td>
                  <td class="px-4 py-3">
                    <div class="flex flex-wrap justify-end gap-1.5">
                      {u.role !== 'admin' && (
                        <>
                          {/* Not already an approved writer → offer the grant */}
                          {!(u.role === 'writer' && !u.banned) && (
                            <button
                              onClick={() => approveWriter(u.id)}
                              title="Can comment and publish articles"
                              class="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                            >
                              Allow writing
                            </button>
                          )}
                          {!(u.role === 'reader' && !u.banned) && (
                            <button
                              onClick={() => approveReader(u.id)}
                              title="Can comment, but not publish"
                              class="rounded-lg border border-border px-3 py-1.5 text-xs transition hover:border-primary hover:text-primary"
                            >
                              Comments only
                            </button>
                          )}
                          {!u.banned && (
                            <button
                              onClick={() => block(u.id)}
                              title="Read-only — cannot comment or publish"
                              class="rounded-lg border border-border px-3 py-1.5 text-xs transition hover:border-primary hover:text-primary"
                            >
                              Block
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {shownUsers.length === 0 && (
                <tr>
                  <td colSpan={6} class="px-4 py-10 text-center text-muted">
                    No users match that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* POSTS */}
      {tab === 'posts' && (
        <ul class="flex flex-col gap-3">
          {posts.map((p) => (
            <li key={p.id} class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-4">
              <div class="min-w-0">
                <div class="mb-1 flex items-center gap-2">
                  <span
                    class={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
                      p.status === 'published' ? 'bg-secondary/15 text-secondary' : 'bg-muted/15 text-muted'
                    }`}
                  >
                    {p.status}
                  </span>
                  <span class="text-xs text-muted">
                    {p.category} · @{nameOf(p.author_id)} · {fmt(p.created_at)}
                  </span>
                </div>
                <p class="truncate font-bold">{p.title}</p>
              </div>
              <button
                onClick={() => removePost(p.id)}
                class="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:border-primary hover:text-primary"
              >
                Delete
              </button>
            </li>
          ))}
          {posts.length === 0 && <p class="py-10 text-center text-muted">No articles yet.</p>}
        </ul>
      )}

      {/* COMMENTS */}
      {tab === 'comments' && (
        <ul class="flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id} class="rounded-2xl border border-border bg-surface px-5 py-4">
              <div class="mb-2 flex items-center justify-between gap-3">
                <p class="text-xs text-muted">
                  @{nameOf(c.author_id)} on <span class="text-fg">/{c.post_slug}</span> · {fmt(c.created_at)}
                </p>
                <button
                  onClick={() => removeComment(c.id)}
                  class="text-xs text-muted transition hover:text-primary"
                >
                  Delete
                </button>
              </div>
              <p class="whitespace-pre-wrap text-sm">{c.body}</p>
            </li>
          ))}
          {comments.length === 0 && <p class="py-10 text-center text-muted">No comments yet.</p>}
        </ul>
      )}
    </div>
  );
}
