'use client';

import { useState, useEffect } from 'react';
import { getComments, WPComment } from '@/lib/wordpress';
import { postComment } from '@/lib/auth';

export default function Comments({ postId }: { postId: number }) {
    const [comments, setComments] = useState<WPComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState({ name: '', email: '', content: '' });

    const fetchComments = async () => {
        setLoading(true);
        const data = await getComments(postId);
        setComments(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchComments();
    }, [postId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!form.name || !form.email || !form.content) {
            setError('Please fill out all fields.');
            return;
        }

        setSubmitting(true);
        const res = await postComment({
            post: postId,
            author_name: form.name,
            author_email: form.email,
            content: form.content
        });
        setSubmitting(false);

        if (res.success) {
            setSuccess('Your comment has been submitted and is awaiting approval.');
            setForm({ name: '', email: '', content: '' });
            fetchComments();
        } else {
            setError(res.error || 'Failed to submit comment.');
        }
    };

    return (
        <div style={{ marginTop: 64, paddingTop: 40, borderTop: '1px solid var(--border)' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.8rem', color: 'var(--navy)', marginBottom: 32, fontStyle: 'italic', letterSpacing: '-0.5px' }}>
                Comments ({comments.length})
            </h3>

            {/* Comments List */}
            {loading ? (
                <div style={{ color: 'var(--text-muted)' }}>Loading comments...</div>
            ) : comments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', marginBottom: 40 }}>No comments yet. Be the first to share your thoughts!</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 48 }}>
                    {comments.map((c) => (
                        <div key={c.id} style={{ padding: 24, background: 'var(--bg-2)', borderRadius: 12, border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent), var(--accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                                    {c.author_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '1.05rem' }}>{c.author_name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {new Date(c.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                        {c.status === 'hold' && <span style={{ marginLeft: 8, color: '#f59e0b', fontSize: '0.75rem', fontWeight: 600 }}>Awaiting Approval</span>}
                                    </div>
                                </div>
                            </div>
                            <div
                                style={{ color: 'var(--text)', lineHeight: 1.7 }}
                                dangerouslySetInnerHTML={{ __html: c.content.rendered }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Comments Form */}
            <div style={{ padding: 32, background: 'var(--bg-3)', borderRadius: 16 }}>
                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', color: 'var(--navy)', marginBottom: 24 }}>Leave a Comment</h4>

                {error && <div style={{ padding: '12px 16px', background: '#fef2f2', color: '#b91c1c', borderRadius: 8, marginBottom: 20, border: '1px solid #f87171' }}>{error}</div>}
                {success && <div style={{ padding: '12px 16px', background: '#f0fdf4', color: '#15803d', borderRadius: 8, marginBottom: 20, border: '1px solid #4ade80' }}>{success}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <input
                            type="text"
                            placeholder="Your Name"
                            value={form.name}
                            onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                            style={{ padding: '14px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', outline: 'none' }}
                        />
                        <input
                            type="email"
                            placeholder="Your Email"
                            value={form.email}
                            onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                            style={{ padding: '14px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', outline: 'none' }}
                        />
                    </div>
                    <textarea
                        placeholder="Your Comment..."
                        rows={4}
                        value={form.content}
                        onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))}
                        style={{ padding: '14px 16px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text)', outline: 'none', resize: 'vertical' }}
                    />
                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            alignSelf: 'flex-start',
                            padding: '12px 32px',
                            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                            color: 'white',
                            border: 'none',
                            borderRadius: 50,
                            fontWeight: 700,
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.7 : 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 14px rgba(249, 115, 22, 0.25)'
                        }}
                    >
                        {submitting ? 'Submitting...' : 'Post Comment'}
                    </button>
                </form>
            </div>
        </div>
    );
}
