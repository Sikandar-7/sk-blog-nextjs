import { useState } from 'preact/hooks';
import { getSupabase } from '../../lib/supabase';

interface Props {
  mode: 'login' | 'signup';
}

export default function AuthForm({ mode }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const supabase = getSupabase();
  const isSignup = mode === 'signup';

  async function onSubmit(e: Event) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!supabase) {
      setError('Sign-in is not configured yet.');
      return;
    }
    if (isSignup && password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }

    setBusy(true);
    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName || email.split('@')[0] } },
        });
        if (error) throw error;
        setNotice('Check your inbox to confirm your email, then sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const field =
    'w-full rounded-xl bg-surface-2 border border-border px-4 py-3 text-fg placeholder:text-muted focus:border-primary focus:outline-none transition-colors';

  return (
    <form onSubmit={onSubmit} class="flex flex-col gap-4">
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

      {isSignup && (
        <label class="flex flex-col gap-2">
          <span class="text-sm font-semibold text-muted">Name</span>
          <input
            class={field}
            type="text"
            value={fullName}
            onInput={(e) => setFullName((e.target as HTMLInputElement).value)}
            placeholder="Sikandar Abbas"
            autocomplete="name"
          />
        </label>
      )}

      <label class="flex flex-col gap-2">
        <span class="text-sm font-semibold text-muted">Email</span>
        <input
          class={field}
          type="email"
          required
          value={email}
          onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
          placeholder="you@example.com"
          autocomplete="email"
        />
      </label>

      <label class="flex flex-col gap-2">
        <span class="text-sm font-semibold text-muted">Password</span>
        <input
          class={field}
          type="password"
          required
          value={password}
          onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          placeholder={isSignup ? 'At least 8 characters' : '••••••••'}
          autocomplete={isSignup ? 'new-password' : 'current-password'}
        />
      </label>

      <button
        type="submit"
        disabled={busy}
        class="mt-2 rounded-xl bg-primary px-5 py-3 font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
      </button>

      <p class="text-center text-sm text-muted">
        {isSignup ? 'Already have an account? ' : "Don't have an account? "}
        <a href={isSignup ? '/login' : '/signup'} class="text-primary hover:underline">
          {isSignup ? 'Sign in' : 'Create one'}
        </a>
      </p>
    </form>
  );
}
