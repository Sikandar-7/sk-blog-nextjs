import Link from 'next/link';
import { getPostBySlug, getPosts, formatDate, stripHtml } from '@/lib/wordpress';
import PostCard from '@/components/PostCard';
import Comments from '@/components/Comments';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPostBySlug(slug);
    if (!post) return { title: 'Post Not Found' };
    return {
        title: post.title.rendered,
        description: stripHtml(post.excerpt.rendered).slice(0, 160),
    };
}

export default async function SinglePostPage({ params }: Props) {
    const { slug } = await params;
    const post = await getPostBySlug(slug);
    if (!post) notFound();

    const image = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    const imgAlt = post._embedded?.['wp:featuredmedia']?.[0]?.alt_text || post.title.rendered;
    const cats = post._embedded?.['wp:term']?.[0] ?? [];
    const author = post._embedded?.author?.[0]?.name ?? 'Sikandar Abbas';

    const { posts: related } = await getPosts({
        per_page: 3,
        ...(cats[0] ? { categories: cats[0].id } : {}),
    });
    const relatedPosts = related.filter(p => p.id !== post.id).slice(0, 3);

    return (
        <article className="single-post">
            <div className="container">
                {/* Breadcrumb */}
                <nav className="breadcrumb">
                    <Link href="/">Home</Link>
                    <span> / </span>
                    <Link href="/blog">Blog</Link>
                    <span> / </span>
                    <span>{post.title.rendered}</span>
                </nav>

                {/* Header */}
                <div className="post-header" style={{ maxWidth: 800, margin: '0 auto 40px' }}>
                    <div className="post-meta" style={{ marginBottom: 20 }}>
                        {cats.map(cat => (
                            <Link key={cat.id} href={`/category/${cat.slug}`} className="category-badge">
                                {cat.name}
                            </Link>
                        ))}
                    </div>
                    <h1 className="post-title"
                        dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                    />
                    <div className="post-info">
                        <div className="post-author">
                            <div className="author-avatar">✍️</div>
                            <span>{author}</span>
                        </div>
                        <span>📅 {formatDate(post.date)}</span>
                    </div>
                </div>

                {/* Cover Image */}
                {image && (
                    <img src={image} alt={imgAlt} className="post-cover" />
                )}

                {/* Content */}
                <div className="post-body">
                    <div
                        className="post-content"
                        dangerouslySetInnerHTML={{ __html: post.content.rendered }}
                    />
                </div>

                {/* Tags */}
                {cats.length > 0 && (
                    <div className="post-body" style={{ marginTop: 48 }}>
                        <div className="post-meta">
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Topics:</span>
                            {cats.map(cat => (
                                <Link key={cat.id} href={`/category/${cat.slug}`} className="category-badge">
                                    {cat.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Comments Section */}
                <div style={{ maxWidth: 800, margin: '0 auto' }}>
                    <Comments postId={post.id} />
                </div>

                {/* Related Posts */}
                {relatedPosts.length > 0 && (
                    <div className="related-section">
                        <div style={{ maxWidth: 800, margin: '0 auto' }}>
                            <div className="section-header" style={{ marginBottom: 32 }}>
                                <div>
                                    <span className="section-tag">More Reading</span>
                                    <h2 className="section-title">Related Posts</h2>
                                </div>
                                <Link href="/blog" className="view-all">All Posts →</Link>
                            </div>
                        </div>
                        <div className="posts-grid">
                            {relatedPosts.map(p => <PostCard key={p.id} post={p} />)}
                        </div>
                    </div>
                )}

                {/* Back Link */}
                <div style={{ textAlign: 'center', marginTop: 60 }}>
                    <Link href="/blog" className="btn-outline">← Back to Blog</Link>
                </div>
            </div>
        </article>
    );
}
