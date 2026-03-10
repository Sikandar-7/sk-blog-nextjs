'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, logout, getMyPosts, deletePost, getAllPendingPosts, publishPost, rejectPost } from '@/lib/auth';
import { formatDate } from '@/lib/wordpress';

type Post = { id: number; status: string; date: string; slug: string; title: { rendered: string }; _embedded?: { author?: { name: string }[] } };

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [pendingAll, setPendingAll] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingPending, setLoadingPending] = useState(false);
    const [deleting, setDeleting] = useState<number | null>(null);
    const [approving, setApproving] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'my' | 'review'>('my');
    const [pageMy, setPageMy] = useState(1);
    const [pagePending, setPagePending] = useState(1);
    const ITEMS_PER_PAGE = 5;

    useEffect(() => {
        const u = getUser();
        if (!u) { router.push('/login'); return; }
        setUser(u);
        getMyPosts(u.id).then(data => { setPosts(data); setLoading(false); });

        // If admin, load pending posts
        if (u.is_admin) {
            setLoadingPending(true);
            getAllPendingPosts(u.token).then(data => {
                setPendingAll(data);
                setLoadingPending(false);
            });
        }
    }, [router]);

    const handleLogout = () => { logout(); router.push('/'); };

    const handleDelete = async (postId: number) => {
        if (!user || !confirm('Delete this post? This cannot be undone.')) return;
        setDeleting(postId);
        const ok = await deletePost(postId, user.token);
        if (ok) setPosts(prev => prev.filter(p => p.id !== postId));
        setDeleting(null);
    };

    const handleApprove = async (postId: number) => {
        if (!user) return;
        setApproving(postId);
        const result = await publishPost(postId, user.token);
        if (result.success) {
            setPendingAll(prev => prev.filter(p => p.id !== postId));
        }
        setApproving(null);
    };

    const handleReject = async (postId: number) => {
        if (!user || !confirm('Reject and delete this post? This cannot be undone.')) return;
        setApproving(postId);
        const ok = await rejectPost(postId, user.token);
        if (ok) setPendingAll(prev => prev.filter(p => p.id !== postId));
        setApproving(null);
    };

    if (!user) return null;

    const isAdmin = user.is_admin ?? false;

    const totalMyPages = Math.ceil(posts.length / ITEMS_PER_PAGE);
    const paginatedPosts = posts.slice((pageMy - 1) * ITEMS_PER_PAGE, pageMy * ITEMS_PER_PAGE);

    const totalPendingPages = Math.ceil(pendingAll.length / ITEMS_PER_PAGE);
    const paginatedPending = pendingAll.slice((pagePending - 1) * ITEMS_PER_PAGE, pagePending * ITEMS_PER_PAGE);

    return (
        <div className="dashboard-page">
            <div className="container">
                {/* Header */}
                <div className="dashboard-header">
                    <div>
                        <span className="section-tag">{isAdmin ? '🛡️ Admin Dashboard' : 'My Space'}</span>
                        <h1 className="dashboard-title">Hello, <span className="gradient-text-warm">{user.name}!</span></h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>@{user.username}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <Link href="/write" className="btn-primary">✍️ Write New Post</Link>
                        <button onClick={handleLogout} className="btn-draft">Logout</button>
                    </div>
                </div>

                {/* Stats */}
                <div className="dashboard-stats">
                    <div className="dash-stat">
                        <div className="dash-stat-num">{posts.length}</div>
                        <div className="dash-stat-label">Total Submitted</div>
                    </div>
                    <div className="dash-stat">
                        <div className="dash-stat-num">{posts.filter(p => p.status === 'publish').length}</div>
                        <div className="dash-stat-label">🟢 Live</div>
                    </div>
                    <div className="dash-stat">
                        <div className="dash-stat-num">{isAdmin ? pendingAll.length : posts.filter(p => p.status === 'pending').length}</div>
                        <div className="dash-stat-label">🟡 Pending Review</div>
                    </div>
                </div>

                {/* Admin Tabs */}
                {isAdmin && (
                    <div className="dash-tabs">
                        <button
                            className={`dash-tab ${activeTab === 'my' ? 'active' : ''}`}
                            onClick={() => setActiveTab('my')}
                        >
                            📝 My Articles
                        </button>
                        <button
                            className={`dash-tab ${activeTab === 'review' ? 'active' : ''}`}
                            onClick={() => setActiveTab('review')}
                        >
                            🔍 Review Pending
                            {pendingAll.length > 0 && (
                                <span className="dash-tab-badge">{pendingAll.length}</span>
                            )}
                        </button>
                    </div>
                )}

                {/* ── MY ARTICLES TAB ── */}
                {(!isAdmin || activeTab === 'my') && (
                    <div>
                        <div className="section-header" style={{ marginBottom: 24 }}>
                            <div>
                                <span className="section-tag">Content</span>
                                <h2 className="section-title">My Articles</h2>
                            </div>
                            <Link href="/write" className="view-all">+ New Article</Link>
                        </div>

                        {loading ? (
                            <div className="no-posts"><div className="auth-spinner" style={{ width: 40, height: 40, borderWidth: 4, margin: '40px auto' }} /></div>
                        ) : posts.length === 0 ? (
                            <div className="no-posts">
                                <div className="emoji">📝</div>
                                <p>You haven&apos;t written anything yet.</p>
                                <Link href="/write" className="btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>Write Your First Article →</Link>
                            </div>
                        ) : (
                            <div className="dash-posts-list">
                                {paginatedPosts.map(post => (
                                    <div key={post.id} className="dash-post-item">
                                        <div className="dash-post-info">
                                            <div className="dash-post-status">
                                                <span className={`status-badge ${post.status}`}>
                                                    {post.status === 'publish' ? '🟢 Live' : post.status === 'pending' ? '🟠 Pending' : '⚫ Draft'}
                                                </span>
                                                <span className="post-date">📅 {formatDate(post.date)}</span>
                                            </div>
                                            <span className="dash-post-title">{post.title.rendered}</span>
                                        </div>
                                        <div className="dash-post-actions">
                                            {post.status === 'publish' && <Link href={`/blog/${post.slug}`} className="dash-action-btn view">View</Link>}
                                            <Link href={`/write?edit=${post.id}`} className="dash-action-btn view" style={{ background: 'var(--bg-3)', color: 'var(--navy)' }}>Edit</Link>
                                            <button onClick={() => handleDelete(post.id)} className="dash-action-btn delete" disabled={deleting === post.id}>
                                                {deleting === post.id ? '...' : 'Delete'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Pagination for My Articles */}
                        {totalMyPages > 1 && (
                            <div className="pagination" style={{ marginTop: 32 }}>
                                <button className={`page-btn ${pageMy <= 1 ? 'disabled' : ''}`} onClick={() => setPageMy(p => Math.max(1, p - 1))}>←</button>
                                {Array.from({ length: totalMyPages }, (_, i) => i + 1).map(p => (
                                    <button key={p} className={`page-btn ${p === pageMy ? 'active' : ''}`} onClick={() => setPageMy(p)}>{p}</button>
                                ))}
                                <button className={`page-btn ${pageMy >= totalMyPages ? 'disabled' : ''}`} onClick={() => setPageMy(p => Math.min(totalMyPages, p + 1))}>→</button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── ADMIN REVIEW TAB ── */}
                {isAdmin && activeTab === 'review' && (
                    <div>
                        <div className="section-header" style={{ marginBottom: 24 }}>
                            <div>
                                <span className="section-tag">Admin</span>
                                <h2 className="section-title">Pending Review</h2>
                            </div>
                        </div>

                        {loadingPending ? (
                            <div className="no-posts"><div className="auth-spinner" style={{ width: 40, height: 40, borderWidth: 4, margin: '40px auto' }} /></div>
                        ) : pendingAll.length === 0 ? (
                            <div className="no-posts">
                                <div className="emoji">✅</div>
                                <p>No posts waiting for review. All clear!</p>
                            </div>
                        ) : (
                            <div className="dash-posts-list">
                                {paginatedPending.map(post => {
                                    const authorName = post._embedded?.author?.[0]?.name || 'Unknown';
                                    return (
                                        <div key={post.id} className="dash-post-item review-item">
                                            <div className="dash-post-info">
                                                <div className="dash-post-status">
                                                    <span className="status-badge pending">🟠 Pending</span>
                                                    <span className="post-date">✍️ by <strong>{authorName}</strong></span>
                                                    <span className="post-date">📅 {formatDate(post.date)}</span>
                                                </div>
                                                <span className="dash-post-title">{post.title.rendered}</span>
                                            </div>
                                            <div className="dash-post-actions">
                                                <button
                                                    className="dash-action-btn approve"
                                                    disabled={approving === post.id}
                                                    onClick={() => handleApprove(post.id)}
                                                >
                                                    {approving === post.id ? '...' : '✅ Approve'}
                                                </button>
                                                <button
                                                    className="dash-action-btn delete"
                                                    disabled={approving === post.id}
                                                    onClick={() => handleReject(post.id)}
                                                >
                                                    ❌ Reject
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Pagination for Pending Articles */}
                        {totalPendingPages > 1 && (
                            <div className="pagination" style={{ marginTop: 32 }}>
                                <button className={`page-btn ${pagePending <= 1 ? 'disabled' : ''}`} onClick={() => setPagePending(p => Math.max(1, p - 1))}>←</button>
                                {Array.from({ length: totalPendingPages }, (_, i) => i + 1).map(p => (
                                    <button key={p} className={`page-btn ${p === pagePending ? 'active' : ''}`} onClick={() => setPagePending(p)}>{p}</button>
                                ))}
                                <button className={`page-btn ${pagePending >= totalPendingPages ? 'disabled' : ''}`} onClick={() => setPagePending(p => Math.min(totalPendingPages, p + 1))}>→</button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
