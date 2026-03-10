import Link from 'next/link';
import { getCategoryBySlug, getPosts, getCategories } from '@/lib/wordpress';
import PostCard from '@/components/PostCard';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const cat = await getCategoryBySlug(slug);
    if (!cat) return { title: 'Category Not Found' };
    return {
        title: `${cat.name} Articles`,
        description: `Browse all ${cat.name} articles on SK Blog.`,
    };
}

export default async function CategoryPage({ params, searchParams }: Props) {
    const { slug } = await params;
    const sp = await searchParams;
    const page = parseInt(sp.page ?? '1');

    const cat = await getCategoryBySlug(slug);
    if (!cat) notFound();

    const [{ posts, totalPages }, allCategories] = await Promise.all([
        getPosts({ per_page: 9, page, categories: cat.id }),
        getCategories(),
    ]);

    return (
        <div className="blog-page">
            <div className="container">
                {/* Header */}
                <div className="blog-hero">
                    <span className="section-tag">Category</span>
                    <h1 className="hero-title">{cat.name}</h1>
                    <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto' }}>
                        {cat.count} article{cat.count !== 1 ? 's' : ''} in {cat.name}
                    </p>
                </div>

                {/* Category Filter */}
                <div className="category-filter">
                    <Link href="/blog" className="cat-btn">All</Link>
                    {allCategories.map(c => (
                        <Link
                            key={c.id}
                            href={`/category/${c.slug}`}
                            className={`cat-btn ${c.slug === slug ? 'active' : ''}`}
                        >
                            {c.name} ({c.count})
                        </Link>
                    ))}
                </div>

                {/* Posts */}
                {posts.length === 0 ? (
                    <div className="no-posts">
                        <div className="emoji">📭</div>
                        <p>No published posts in this category yet.</p>
                        <Link href="/blog" className="btn-outline" style={{ marginTop: 20, display: 'inline-flex' }}>
                            ← View All Posts
                        </Link>
                    </div>
                ) : (
                    <div className="posts-grid">
                        {posts.map(post => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination">
                        <Link href={`/category/${slug}?page=${page - 1}`}
                            className={`page-btn ${page <= 1 ? 'disabled' : ''}`}>←</Link>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <Link key={p} href={`/category/${slug}?page=${p}`}
                                className={`page-btn ${p === page ? 'active' : ''}`}>{p}</Link>
                        ))}
                        <Link href={`/category/${slug}?page=${page + 1}`}
                            className={`page-btn ${page >= totalPages ? 'disabled' : ''}`}>→</Link>
                    </div>
                )}
            </div>
        </div>
    );
}
