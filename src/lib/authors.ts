// lib/authors.ts — WordPress Authors API helpers

const WP_API = process.env.NEXT_PUBLIC_WP_API || 'http://wp-blog.local/wp-json/wp/v2';

export interface WPAuthor {
    id: number;
    name: string;
    slug: string;
    description: string;
    link: string;
    avatar_urls: { '96': string; '48': string; '24': string };
    meta: Record<string, unknown>;
}

export async function getAuthors(): Promise<WPAuthor[]> {
    const res = await fetch(`${WP_API}/users?per_page=50&context=view`, {
        next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
}

export async function getAuthorById(id: number): Promise<WPAuthor | null> {
    const res = await fetch(`${WP_API}/users/${id}?context=view`, {
        next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
}
