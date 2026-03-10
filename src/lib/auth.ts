// lib/auth.ts — Frontend Auth helpers

export interface AuthUser {
    id: number;
    username: string;
    name: string;
    email: string;
    token: string;
    is_admin?: boolean;
}

const WP_API = process.env.NEXT_PUBLIC_WP_API || 'http://wp-blog.local/wp-json/wp/v2';
const SK_API = 'http://wp-blog.local/wp-json/sk-blog/v1';

// ── Save / Get / Clear ──────────────────────────────────────
export function saveUser(user: AuthUser): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('sk_blog_user', JSON.stringify(user));
}
export function getUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem('sk_blog_user') || 'null'); }
    catch { return null; }
}
export function logout(): void {
    if (typeof window !== 'undefined') localStorage.removeItem('sk_blog_user');
}

// ── Register ────────────────────────────────────────────────
export async function register(data: { name: string; username: string; email: string; password: string }) {
    try {
        const res = await fetch(`${SK_API}/register`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) return { success: false, error: json.message || 'Registration failed.' };
        const user: AuthUser = { ...json.user, token: json.token };
        saveUser(user);
        return { success: true, user };
    } catch { return { success: false, error: 'Cannot connect. Is wp-blog.local running?' }; }
}

// ── Login ────────────────────────────────────────────────────
export async function login(data: { username: string; password: string }) {
    try {
        const res = await fetch(`${SK_API}/login`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) return { success: false, error: json.message || 'Login failed.' };
        const user: AuthUser = { ...json.user, token: json.token };
        saveUser(user);
        return { success: true, user };
    } catch { return { success: false, error: 'Cannot connect. Is wp-blog.local running?' }; }
}

// ── Create Category ─────────────────────────────────────────
export async function createCategory(name: string, token: string): Promise<{ success: boolean; error?: string; id?: number; name?: string }> {
    try {
        const res = await fetch(`${SK_API}/create-category`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${token}` },
            body: JSON.stringify({ name }),
        });
        const json = await res.json();
        if (!res.ok) return { success: false, error: json.message || 'Failed to create category.' };
        return { success: true, id: json.id, name: json.name };
    } catch { return { success: false, error: 'Category creation failed.' }; }
}

// ── Create Tag ───────────────────────────────────────────────
export async function createTag(name: string, token: string): Promise<{ success: boolean; error?: string; id?: number; name?: string }> {
    try {
        const res = await fetch(`${SK_API}/create-tag`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${token}` },
            body: JSON.stringify({ name }),
        });
        const json = await res.json();
        if (!res.ok) return { success: false, error: json.message || 'Failed to create tag.' };
        return { success: true, id: json.id, name: json.name };
    } catch { return { success: false, error: 'Tag creation failed.' }; }
}

// ── Create Post (pending review by default) ──────────────────
export async function createPost(data: {
    title: string;
    content: string;
    excerpt?: string;
    categories?: number[];
    tags?: number[];
    featured_image_url?: string;
    status?: 'publish' | 'draft' | 'pending';
}, token: string): Promise<{ success: boolean; error?: string; postId?: number; slug?: string }> {
    try {
        const payload: Record<string, unknown> = {
            title: data.title,
            content: data.content,
            excerpt: data.excerpt || '',
            categories: data.categories || [],
            tags: data.tags || [],
            status: data.status || 'pending',
        };
        const res = await fetch(`${WP_API}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${token}` },
            body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) return { success: false, error: json.message || 'Failed to submit post.' };
        return { success: true, postId: json.id, slug: json.slug };
    } catch { return { success: false, error: 'Failed to submit. Please try again.' }; }
}

// ── Get My Posts ─────────────────────────────────────────────
export async function getMyPosts(userId: number) {
    try {
        const allStatuses = ['publish', 'draft', 'pending'];
        const results = await Promise.all(
            allStatuses.map(status =>
                fetch(`${WP_API}/posts?author=${userId}&status=${status}&per_page=20`, {
                    headers: getUser()?.token ? { 'Authorization': `Basic ${getUser()!.token}` } : {},
                }).then(r => r.ok ? r.json() : [])
            )
        );
        return results.flat().sort((a: { date: string }, b: { date: string }) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch { return []; }
}

// ── Delete Post ──────────────────────────────────────────────
export async function deletePost(postId: number, token: string): Promise<boolean> {
    try {
        const res = await fetch(`${WP_API}/posts/${postId}?force=true`, {
            method: 'DELETE', headers: { 'Authorization': `Basic ${token}` },
        });
        return res.ok;
    } catch { return false; }
}

// ── Get All Pending Posts (admin only) ───────────────────────
export async function getAllPendingPosts(token: string) {
    try {
        const res = await fetch(`${WP_API}/posts?status=pending&per_page=50&_embed=true`, {
            headers: { 'Authorization': `Basic ${token}` },
        });
        if (!res.ok) return [];
        return await res.json();
    } catch { return []; }
}

// ── Publish a Post (admin approve) ───────────────────────────
export async function publishPost(postId: number, token: string): Promise<{ success: boolean; slug?: string }> {
    try {
        const res = await fetch(`${WP_API}/posts/${postId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${token}` },
            body: JSON.stringify({ status: 'publish' }),
        });
        const json = await res.json();
        if (!res.ok) return { success: false };
        return { success: true, slug: json.slug };
    } catch { return { success: false }; }
}

// ── Reject a Post (admin reject → delete) ────────────────────
export async function rejectPost(postId: number, token: string): Promise<boolean> {
    return deletePost(postId, token);
}
