import Link from 'next/link';
import { getPosts, getCategories } from '@/lib/wordpress';
import PostCard from '@/components/PostCard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Blog',
    description: 'All articles — WordPress, JavaScript, Next.js and web development.',
};

interface Props {
    searchParams: Promise<{ page?: string; category?: string }>;
}

export default async function BlogPage({ searchParams }: Props) {
    const params = await searchParams;
    const page = parseInt(params.page ?? '1');

    const [{ posts, total, totalPages }, categories] = await Promise.all([
        getPosts({ per_page: 9, page }),
        getCategories(),
    ]);

    return (
        <div className="blog-page">
            <div className="container">
                {/* Header */}
                <div className="blog-hero">
                    <span className="section-tag">All Articles</span>
                    <h1 className="hero-title">The Blog</h1>
                    <p style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto' }}>
                        {total} articles on WordPress, Next.js, JavaScript and more.
                    </p>
                </div>

                {/* Category Filter */}
                {categories.length > 0 && (
                    <div className="category-filter">
                        <Link href="/blog" className={`cat-btn ${!params.category ? 'active' : ''}`}>
                            All ({total})
                        </Link>
                        {categories.map(cat => (
                            <Link
                                key={cat.id}
                                href={`/category/${cat.slug}`}
                                className="cat-btn"
                            >
                                {cat.name} ({cat.count})
                            </Link>
                        ))}
                    </div>
                )}

                {/* Posts Grid */}
                {posts.length === 0 ? (
                    <div className="no-posts">
                        <div className="emoji">📝</div>
                        <p>No posts published yet.</p>
                        <Link href="http://my-portfolio.local/wp-admin/post-new.php" target="_blank"
                            className="btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>
                            Write First Post →
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
                        <Link
                            href={`/blog?page=${page - 1}`}
                            className={`page-btn ${page <= 1 ? 'disabled' : ''}`}
                        >
                            ←
                        </Link>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                            <Link
                                key={p}
                                href={`/blog?page=${p}`}
                                className={`page-btn ${p === page ? 'active' : ''}`}
                            >
                                {p}
                            </Link>
                        ))}
                        <Link
                            href={`/blog?page=${page + 1}`}
                            className={`page-btn ${page >= totalPages ? 'disabled' : ''}`}
                        >
                            →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
