import Link from 'next/link';

export default function Footer() {
    const year = new Date().getFullYear();
    return (
        <footer className="site-footer">
            <div className="container">
                <div className="footer-grid">
                    <div className="footer-brand">
                        <div className="footer-logo">SK Blog</div>
                        <p>A headless WordPress blog powered by Next.js. Tutorials, code snippets and insights by Sikandar Abbas.</p>
                    </div>
                    <div className="footer-col">
                        <h4>Navigation</h4>
                        <ul>
                            <li><Link href="/">Home</Link></li>
                            <li><Link href="/blog">All Posts</Link></li>
                            <li><Link href="/category/wordpress">WordPress</Link></li>
                            <li><Link href="/category/javascript">JavaScript</Link></li>
                        </ul>
                    </div>
                    <div className="footer-col">
                        <h4>Connect</h4>
                        <ul>
                            <li><a href="https://github.com/Sikandar-7" target="_blank">🐙 GitHub</a></li>
                            <li><a href="http://my-portfolio.local" target="_blank">🌐 Portfolio</a></li>
                            <li><a href="mailto:sikandar8sa@gmail.com">📧 Email</a></li>
                            <li><a href="https://wa.me/923197171279" target="_blank">💬 WhatsApp</a></li>
                        </ul>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p>© {year} <span>Sikandar Abbas</span> — Built with WordPress + Next.js</p>
                    <p>Powered by <span>WP REST API</span> 🚀</p>
                </div>
            </div>
        </footer>
    );
}
