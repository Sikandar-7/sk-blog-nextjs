import Link from 'next/link';
import { getAuthors } from '@/lib/authors';
import { getPosts } from '@/lib/wordpress';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Authors',
    description: 'Meet the writers behind SK Blog. Join us and share your knowledge.',
};

export default async function AuthorsPage() {
    const [authors, { total }] = await Promise.all([
        getAuthors(),
        getPosts({ per_page: 1 }),
    ]);

    return (
        <div className="blog-page">
            <div className="container">

                {/* Header */}
                <div className="blog-hero">
                    <span className="section-tag">Community</span>
                    <h1 className="hero-title">Our <span className="gradient-text">Authors</span></h1>
                    <p style={{ color: 'var(--text-muted)', maxWidth: 520, margin: '0 auto 40px' }}>
                        {authors.length} writer{authors.length !== 1 ? 's' : ''} sharing knowledge on SK Blog.
                        Join us and start writing today!
                    </p>
                    <Link
                        href="http://wp-blog.local/wp-login.php?action=register"
                        target="_blank"
                        className="btn-primary"
                    >
                        ✍️ Become an Author
                    </Link>
                </div>

                {/* Stats row */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 24,
                    marginBottom: 64,
                    textAlign: 'center',
                }}>
                    {[
                        { num: authors.length, label: 'Authors' },
                        { num: total, label: 'Articles Published' },
                        { num: '∞', label: 'Topics to Explore' },
                    ].map(s => (
                        <div key={s.label} style={{
                            background: 'var(--bg-2)',
                            border: '1.5px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            padding: '32px 16px',
                            boxShadow: 'var(--shadow-sm)',
                        }}>
                            <div style={{
                                fontFamily: 'var(--font-heading)',
                                fontSize: '2.5rem',
                                fontWeight: 800,
                                fontStyle: 'italic',
                                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>{s.num}</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 6, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Authors Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                    {authors.map(author => (
                        <div key={author.id} style={{
                            background: 'var(--bg-2)',
                            border: '1.5px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            padding: 28,
                            boxShadow: 'var(--shadow-sm)',
                            transition: 'var(--transition)',
                            textAlign: 'center',
                        }}
                            className="author-card"
                        >
                            <img
                                src={author.avatar_urls['96']}
                                alt={author.name}
                                style={{
                                    width: 80,
                                    height: 80,
                                    borderRadius: '50%',
                                    margin: '0 auto 16px',
                                    border: '3px solid var(--accent)',
                                    boxShadow: '0 4px 16px var(--accent-glow)',
                                }}
                            />
                            <h3 style={{
                                fontFamily: 'var(--font-heading)',
                                fontStyle: 'italic',
                                fontSize: '1.2rem',
                                fontWeight: 700,
                                color: 'var(--navy)',
                                marginBottom: 8,
                            }}>{author.name}</h3>
                            {author.description && (
                                <p style={{
                                    color: 'var(--text-muted)',
                                    fontSize: '0.85rem',
                                    lineHeight: 1.65,
                                    marginBottom: 16,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical' as const,
                                    overflow: 'hidden',
                                }}>{author.description}</p>
                            )}
                            <Link
                                href={`/blog?author=${author.id}`}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    color: 'var(--accent)',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                View Posts →
                            </Link>
                        </div>
                    ))}
                </div>

                {/* CTA Join Section */}
                <div style={{
                    marginTop: 80,
                    background: 'var(--navy)',
                    borderRadius: 'var(--radius)',
                    padding: '64px 48px',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: 'translate(-50%,-50%)',
                        width: 500, height: 200,
                        background: 'radial-gradient(ellipse, rgba(249,115,22,0.15), transparent 70%)',
                        pointerEvents: 'none',
                    }} />
                    <div style={{ position: 'relative' }}>
                        <span style={{ fontSize: '3rem', display: 'block', marginBottom: 16 }}>✍️</span>
                        <h2 style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                            fontWeight: 800,
                            fontStyle: 'italic',
                            color: 'white',
                            marginBottom: 16,
                            letterSpacing: '-0.5px',
                        }}>
                            Share Your Knowledge
                        </h2>
                        <p style={{ color: '#94a3b8', maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.8, fontSize: '1rem' }}>
                            Join our community of writers. Create your free account and start publishing your articles today!
                        </p>
                        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link
                                href="http://wp-blog.local/wp-login.php?action=register"
                                target="_blank"
                                className="btn-primary"
                            >
                                🚀 Create Free Account
                            </Link>
                            <Link
                                href="http://wp-blog.local/wp-admin"
                                target="_blank"
                                className="btn-outline"
                                style={{ borderColor: 'rgba(255,255,255,0.15)', color: '#cbd5e1' }}
                            >
                                Already have an account? Login →
                            </Link>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
