// lib/wordpress.ts — WordPress REST API helpers

const WP_API = process.env.NEXT_PUBLIC_WP_API || 'http://my-portfolio.local/wp-json/wp/v2';

export interface WPPost {
    id: number;
    slug: string;
    title: { rendered: string };
    excerpt: { rendered: string };
    content: { rendered: string };
    date: string;
    _embedded?: {
        'wp:featuredmedia'?: Array<{ source_url: string; alt_text: string }>;
        'wp:term'?: Array<Array<WPCategory>>;
        author?: Array<{ name: string }>;
    };
    featured_media: number;
    categories: number[];
}

export interface WPCategory {
    id: number;
    name: string;
    slug: string;
    count: number;
}

export async function getPosts(params: {
    per_page?: number;
    page?: number;
    categories?: number;
    search?: string;
} = {}): Promise<{ posts: WPPost[]; total: number; totalPages: number }> {
    const query = new URLSearchParams({
        _embed: 'true',
        per_page: String(params.per_page ?? 9),
        page: String(params.page ?? 1),
        ...(params.categories ? { categories: String(params.categories) } : {}),
        ...(params.search ? { search: params.search } : {}),
    });

    const res = await fetch(`${WP_API}/posts?${query}`, { next: { revalidate: 60 } });
    if (!res.ok) return { posts: [], total: 0, totalPages: 0 };

    const posts: WPPost[] = await res.json();
    const total = parseInt(res.headers.get('X-WP-Total') ?? '0');
    const totalPages = parseInt(res.headers.get('X-WP-TotalPages') ?? '1');

    return { posts, total, totalPages };
}

export async function getPostBySlug(slug: string): Promise<WPPost | null> {
    const res = await fetch(`${WP_API}/posts?slug=${slug}&_embed=true`, {
        next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const posts: WPPost[] = await res.json();
    return posts[0] ?? null;
}

export async function getCategories(): Promise<WPCategory[]> {
    const res = await fetch(`${WP_API}/categories?per_page=50&hide_empty=true`, {
        next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    return res.json();
}

export async function getCategoryBySlug(slug: string): Promise<WPCategory | null> {
    const res = await fetch(`${WP_API}/categories?slug=${slug}`, {
        next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const cats: WPCategory[] = await res.json();
    return cats[0] ?? null;
}

export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });
}

export function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

export interface WPComment {
    id: number;
    author_name: string;
    date: string;
    content: { rendered: string };
    status: string;
}

export async function getComments(postId: number): Promise<WPComment[]> {
    const res = await fetch(`${WP_API}/comments?post=${postId}&per_page=50&order=asc`, {
        next: { revalidate: 0 },
    });
    if (!res.ok) return [];
    return res.json();
}
