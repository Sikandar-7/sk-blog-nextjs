'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register } from '@/lib/auth';

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const result = await register(form);
        setLoading(false);
        if (result.success) {
            router.push('/dashboard');
        } else {
            setError(result.error || 'Something went wrong.');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">SK Blog</div>
                <h1 className="auth-title">Create Account</h1>
                <p className="auth-subtitle">Join our community of writers. It&apos;s free!</p>

                {error && <div className="auth-error">⚠️ {error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="name">Full Name</label>
                        <input
                            id="name" type="text" name="name"
                            placeholder="Sikandar Abbas"
                            value={form.name} onChange={handleChange} required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username" type="text" name="username"
                            placeholder="sikandar7"
                            value={form.username} onChange={handleChange} required
                            autoCapitalize="none"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email" type="email" name="email"
                            placeholder="sikandar@example.com"
                            value={form.email} onChange={handleChange} required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password" type="password" name="password"
                            placeholder="Min. 6 characters"
                            value={form.password} onChange={handleChange} required minLength={6}
                        />
                    </div>
                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? <span className="auth-spinner" /> : '🚀 Create Account'}
                    </button>
                </form>

                <p className="auth-footer">
                    Already have an account?{' '}
                    <Link href="/login">Sign In →</Link>
                </p>
            </div>
        </div>
    );
}
