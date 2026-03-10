'use client';
import { useState, useEffect, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getUser, createPost, createCategory, createTag } from '@/lib/auth';
import { getCategories, WPCategory } from '@/lib/wordpress';

const RichEditor = lazy(() => import('@/components/RichEditor'));

interface TagItem { id: number; name: string; }

export default function WritePage() {
    const router = useRouter();
    const [user, setUser] = useState<ReturnType<typeof getUser>>(null);
    const [categories, setCategories] = useState<WPCategory[]>([]);
    const [selectedCats, setSelectedCats] = useState<number[]>([]);
    const [tags, setTags] = useState<TagItem[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [newCatInput, setNewCatInput] = useState('');
    const [addingCat, setAddingCat] = useState(false);
    const [form, setForm] = useState({ title: '', content: '', excerpt: '', featuredImage: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitType, setSubmitType] = useState<'publish' | 'pending' | 'draft' | null>(null);
    const isAdmin = user?.is_admin ?? false;

    useEffect(() => {
        const u = getUser();
        if (!u) { router.push('/login'); return; }
        setUser(u);
        getCategories().then(setCategories).catch(() => { });
    }, [router]);

    const toggleCat = (id: number) =>
        setSelectedCats(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);

    // ── Add new category ─────────────────────────────────────
    const handleAddCategory = async () => {
        if (!newCatInput.trim() || !user) return;
        setAddingCat(true);
        const result = await createCategory(newCatInput.trim(), user.token);
        if (result.success && result.id && result.name) {
            const newCat: WPCategory = { id: result.id, name: result.name, slug: result.name.toLowerCase().replace(/\s+/g, '-'), count: 0 };
            setCategories(prev => [...prev, newCat]);
            setSelectedCats(prev => [...prev, result.id!]);
            setNewCatInput('');
        }
        setAddingCat(false);
    };

    // ── Add tag ──────────────────────────────────────────────
    const handleAddTag = async (raw?: string) => {
        const name = (raw || tagInput).trim();
        if (!name || !user) return;
        if (tags.find(t => t.name.toLowerCase() === name.toLowerCase())) { setTagInput(''); return; }
        const result = await createTag(name, user.token);
        if (result.success && result.id && result.name) {
            setTags(prev => [...prev, { id: result.id!, name: result.name! }]);
        }
        setTagInput('');
    };

    const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const removeTag = (id: number) => setTags(prev => prev.filter(t => t.id !== id));

    // ── Submit ───────────────────────────────────────────────
    const handleSubmit = async (status: 'publish' | 'pending' | 'draft') => {
        setError('');
        if (!form.title.trim()) { setError('Please add a title for your article.'); return; }
        const strippedContent = form.content.replace(/<[^>]*>/g, '').trim();
        if (strippedContent.length < 30) { setError('Please write at least a few sentences of content.'); return; }
        if (!user) return;

        setLoading(true);
        setSubmitType(status);

        const result = await createPost({
            title: form.title,
            content: form.content,
            excerpt: form.excerpt,
            categories: selectedCats,
            tags: tags.map(t => t.id),
            status,
        }, user.token);

        setLoading(false);
        setSubmitType(null);

        if (result.success) {
            if (status === 'publish') {
                setSuccess('published');
            } else if (status === 'pending') {
                setSuccess('submitted');
            } else {
                setSuccess('draft');
                setForm({ title: '', content: '', excerpt: '', featuredImage: '' });
                setSelectedCats([]); setTags([]);
            }
        } else {
            setError(result.error || 'Something went wrong. Is wp-blog.local running?');
        }
    };

    if (!user) return null;

    // ── Success screens ──────────────────────────────────────
    if (success === 'published') {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ maxWidth: 520, textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚀</div>
                    <h2 className="auth-title">Article Published!</h2>
                    <p className="auth-subtitle" style={{ marginBottom: 24 }}>Your article is now <strong>live</strong> on the blog.</p>
                    <div className="auth-success" style={{ marginBottom: 24 }}>✅ Readers can now find and read your article!</div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <Link href="/blog" className="btn-primary" style={{ display: 'inline-flex' }}>View Blog →</Link>
                        <button className="btn-draft" onClick={() => { setSuccess(''); setForm({ title: '', content: '', excerpt: '', featuredImage: '' }); setSelectedCats([]); setTags([]); }}>Write Another</button>
                    </div>
                </div>
            </div>
        );
    }

    if (success === 'submitted') {
        return (
            <div className="auth-page">
                <div className="auth-card" style={{ maxWidth: 520, textAlign: 'center' }}>
                    <div style={{ fontSize: '3rem', marginBottom: 16 }}>🎉</div>
                    <h2 className="auth-title">Article Submitted!</h2>
                    <p className="auth-subtitle" style={{ marginBottom: 24 }}>
                        Your article is now <strong>pending review</strong>. The admin will review it and publish it shortly.
                    </p>
                    <div className="auth-success" style={{ marginBottom: 24 }}>
                        ✅ Check your Dashboard — status will change from <strong>&quot;🟠 Pending&quot;</strong> to <strong>&quot;🟢 Live&quot;</strong> once approved.
                    </div>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                        <Link href="/dashboard" className="btn-primary" style={{ display: 'inline-flex' }}>Go to Dashboard →</Link>
                        <button className="btn-draft" onClick={() => { setSuccess(''); setForm({ title: '', content: '', excerpt: '', featuredImage: '' }); setSelectedCats([]); setTags([]); }}>Write Another</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="write-page">
            {/* Sticky Header */}
            <div className="write-header">
                <div className="container">
                    <div className="write-header-inner">
                        <div>
                            <Link href="/dashboard" className="back-link">← Dashboard</Link>
                            <h1 className="write-heading">New Article</h1>
                        </div>
                        <div className="write-actions">
                            <button className="btn-draft" disabled={loading} onClick={() => handleSubmit('draft')}>
                                {loading && submitType === 'draft' ? <span className="auth-spinner" style={{ borderTopColor: 'var(--text-muted)', borderColor: 'var(--border)' }} /> : '💾 Save Draft'}
                            </button>
                            <button
                                className="auth-btn"
                                disabled={loading}
                                style={{ padding: '10px 24px', width: 'auto', marginTop: 0 }}
                                onClick={() => handleSubmit(isAdmin ? 'publish' : 'pending')}
                            >
                                {loading && (submitType === 'pending' || submitType === 'publish')
                                    ? <span className="auth-spinner" />
                                    : isAdmin ? '🚀 Publish Now' : '📤 Submit for Review'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container">
                {error && <div className="auth-error" style={{ marginTop: 16 }}>⚠️ {error}</div>}
                {success === 'draft' && <div className="auth-success" style={{ marginTop: 16 }}>✅ Saved as draft!</div>}

                <div className="write-layout">
                    {/* ── Main Editor ── */}
                    <div className="write-main">
                        <input
                            className="write-title-input"
                            type="text"
                            placeholder="Your article title..."
                            value={form.title}
                            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                            maxLength={150}
                        />
                        <Suspense fallback={<div className="editor-loading">Loading editor...</div>}>
                            <RichEditor value={form.content} onChange={html => setForm(p => ({ ...p, content: html }))} />
                        </Suspense>
                    </div>

                    {/* ── Sidebar ── */}
                    <div className="write-sidebar">
                        {/* Author info */}
                        <div className="sidebar-card author-sidebar-card">
                            <div className="author-sidebar-avatar">{user.name.charAt(0).toUpperCase()}</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)' }}>{user.name}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>@{user.username}</div>
                            </div>
                        </div>

                        {/* Publish card */}
                        <div className="sidebar-publish-card">
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>📋 Publish Status</div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, background: isAdmin ? '#f0fdf4' : 'var(--accent-light)', border: isAdmin ? '1px solid #bbf7d0' : '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: '8px 12px' }}>
                                    {isAdmin
                                        ? <><strong>🛡️ Admin Mode</strong> — Your posts publish <strong>immediately</strong>.</>
                                        : <>Posts go to <strong>Pending Review</strong> — admin approves before going live.</>}
                                </div>
                            </div>
                            <button
                                className="auth-btn"
                                disabled={loading}
                                style={{ width: '100%', marginBottom: 8, marginTop: 0 }}
                                onClick={() => handleSubmit(isAdmin ? 'publish' : 'pending')}
                            >
                                {loading && (submitType === 'pending' || submitType === 'publish')
                                    ? <span className="auth-spinner" />
                                    : isAdmin ? '🚀 Publish Now' : '📤 Submit for Review'}
                            </button>
                            <button className="btn-draft" disabled={loading} style={{ width: '100%' }} onClick={() => handleSubmit('draft')}>
                                {loading && submitType === 'draft' ? '...' : '💾 Save as Draft'}
                            </button>
                        </div>

                        {/* Excerpt */}
                        <div className="sidebar-card">
                            <h3 className="sidebar-card-title">📋 Excerpt / Summary</h3>
                            <textarea
                                className="write-excerpt-input"
                                placeholder="Short description shown in post cards (auto-generated if empty)"
                                value={form.excerpt}
                                onChange={e => setForm(p => ({ ...p, excerpt: e.target.value }))}
                                rows={3}
                            />
                        </div>

                        {/* Tags */}
                        <div className="sidebar-card">
                            <h3 className="sidebar-card-title">🏷️ Tags / Topics</h3>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                                Type a tag and press <kbd style={{ background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 4, fontSize: '0.7rem' }}>Enter</kbd> or <kbd style={{ background: 'var(--bg-3)', padding: '1px 5px', borderRadius: 4, fontSize: '0.7rem' }}>,</kbd> to add
                            </p>
                            {/* Tag pills */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: tags.length ? 10 : 0 }}>
                                {tags.map(tag => (
                                    <span key={tag.id} className="tag-pill">
                                        {tag.name}
                                        <button onClick={() => removeTag(tag.id)} className="tag-remove">✕</button>
                                    </span>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <input
                                    type="text"
                                    className="sidebar-input"
                                    placeholder="Add a tag..."
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={handleTagKeyDown}
                                />
                                <button className="sidebar-add-btn" onClick={() => handleAddTag()}>+</button>
                            </div>
                        </div>

                        {/* Categories */}
                        <div className="sidebar-card">
                            <h3 className="sidebar-card-title">📂 Categories</h3>
                            <div className="cat-checkboxes" style={{ marginBottom: 14 }}>
                                {categories.map(cat => (
                                    <label key={cat.id} className="cat-checkbox">
                                        <input
                                            type="checkbox"
                                            checked={selectedCats.includes(cat.id)}
                                            onChange={() => toggleCat(cat.id)}
                                        />
                                        <span>{cat.name}</span>
                                    </label>
                                ))}
                            </div>
                            {/* Add new category */}
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>+ ADD NEW CATEGORY</p>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <input
                                        type="text"
                                        className="sidebar-input"
                                        placeholder="New category name..."
                                        value={newCatInput}
                                        onChange={e => setNewCatInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                                    />
                                    <button className="sidebar-add-btn" onClick={handleAddCategory} disabled={addingCat}>
                                        {addingCat ? '...' : '+'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Writing tips */}
                        <div className="sidebar-card tips-card">
                            <h3 className="sidebar-card-title">💡 Writing Tips</h3>
                            <ul className="tips-list">
                                <li>Use <strong>Heading 2</strong> for main sections</li>
                                <li>Add a quote with the ❝ button</li>
                                <li>Use code blocks for code snippets</li>
                                <li>Add relevant tags for discoverability</li>
                                <li>Select a category before submitting</li>
                            </ul>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
