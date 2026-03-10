'use client';

import { useState, useEffect } from 'react';

export default function ThemeSwitcher() {
    const [theme, setTheme] = useState('light');

    // Load theme from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'light';
        setTheme(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    // Prevent hydration mismatch by not rendering anything until mounted
    if (!theme) return <div style={{ width: 32, height: 32 }}></div>;

    return (
        <button
            onClick={toggleTheme}
            aria-label="Toggle Dark Mode"
            style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.2rem',
                padding: '4px',
                color: 'var(--text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition)'
            }}
        >
            {theme === 'light' ? '🌙' : '☀️'}
        </button>
    );
}
