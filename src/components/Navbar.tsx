'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUser, logout, AuthUser } from '@/lib/auth';

export default function Navbar() {
    const path = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);

    useEffect(() => {
        setUser(getUser());
        // listen for storage changes (login/logout in other tabs)
        const onStorage = () => setUser(getUser());
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, [path]); // re-check on route change

    const handleLogout = () => {
        logout();
        setUser(null);
        router.push('/');
    };

    return (
        <nav className="navbar">
            <div className="container">
                <div className="navbar-inner">
                    <Link href="/" className="navbar-logo">SK Blog</Link>
                    <ul className="navbar-links">
                        <li><Link href="/" className={path === '/' ? 'active' : ''}>Home</Link></li>
                        <li><Link href="/blog" className={path.startsWith('/blog') ? 'active' : ''}>Blog</Link></li>
                        <li><Link href="/authors" className={path.startsWith('/authors') ? 'active' : ''}>Authors</Link></li>

                        {user ? (
                            // Logged in state
                            <>
                                <li>
                                    <Link href="/write" className={path === '/write' ? 'active' : ''}>
                                        ✍️ Write
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/dashboard" className={`btn-write ${path === '/dashboard' ? 'active' : ''}`}>
                                        👤 {user.name.split(' ')[0]}
                                    </Link>
                                </li>
                                <li>
                                    <button onClick={handleLogout} className="navbar-logout-btn">
                                        Logout
                                    </button>
                                </li>
                            </>
                        ) : (
                            // Logged out state
                            <>
                                <li><Link href="/login" className={path === '/login' ? 'active' : ''}>Login</Link></li>
                                <li>
                                    <Link href="/register" className="btn-write">
                                        ✍️ Start Writing
                                    </Link>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
}
