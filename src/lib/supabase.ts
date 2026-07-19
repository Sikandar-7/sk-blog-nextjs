import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser-side Supabase client.
 *
 * The site is fully static, so this only ever runs inside an island in the
 * reader's browser. The key below is the *publishable* key — it is designed to
 * be public and every table is protected by row level security, so it cannot be
 * used to read drafts or write as somebody else. The service_role key must
 * never appear in this project.
 */
const url = import.meta.env.PUBLIC_SUPABASE_URL;
const key = import.meta.env.PUBLIC_SUPABASE_KEY;

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !key) {
    // Missing config shouldn't crash a reading page — the interactive bits
    // simply stay disabled and say so.
    return null;
  }
  if (!client) {
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}

export const isSupabaseConfigured = Boolean(url && key);

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export interface DbPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  category: string;
  tags: string[];
  status: 'draft' | 'published';
  reading_minutes: number;
  published_at: string | null;
  created_at: string;
  author_id: string;
  author_username?: string;
  author_name?: string | null;
  author_avatar?: string | null;
  like_count?: number;
  comment_count?: number;
}

/** Turn a title into a url-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

/** Rough reading time, matching the convention used for the MDX posts. */
export function readingMinutes(markdown: string): number {
  const words = markdown.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
