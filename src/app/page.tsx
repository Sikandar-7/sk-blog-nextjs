import Link from 'next/link';
import { getPosts, getCategories } from '@/lib/wordpress';
import PostCard from '@/components/PostCard';

export default async function HomePage() {
  const [{ posts }, categories] = await Promise.all([
    getPosts({ per_page: 7 }),
    getCategories(),
  ]);

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <>
      {/* HERO */}
      <section className="hero-section">
        <div className="hero-glow" />
        <div className="container">
          <div className="hero-tag">✦ Community Blog Platform</div>
          <h1 className="hero-title">
            Write, Share &<br />
            <span className="gradient-text">Inspire.</span>
          </h1>
          <p className="hero-desc">
            A community blog where developers share knowledge. Read articles on WordPress,
            JavaScript, Next.js and more — or join as a writer!
          </p>
          <div className="hero-cta">
            <Link href="/blog" className="btn-primary">Read Articles →</Link>
            <Link
              href="http://wp-blog.local/wp-login.php?action=register"
              target="_blank"
              className="btn-outline"
            >
              ✍️ Start Writing
            </Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div>
              <div className="stat-number">{posts.length > 0 ? '10+' : '0'}</div>
              <div className="stat-label">Articles Published</div>
            </div>
            <div>
              <div className="stat-number">{categories.length || '4'}+</div>
              <div className="stat-label">Categories</div>
            </div>
            <div>
              <div className="stat-number">Open</div>
              <div className="stat-label">Free to Join</div>
            </div>
            <div>
              <div className="stat-number">Next.js</div>
              <div className="stat-label">Powered Frontend</div>
            </div>
          </div>
        </div>
      </section>

      {/* LATEST POSTS */}
      <section style={{ padding: '0 0 80px' }}>
        <div className="container">
          <div className="section-header">
            <div>
              <span className="section-tag">Latest</span>
              <h2 className="section-title">Recent Posts</h2>
            </div>
            <Link href="/blog" className="view-all">All Posts →</Link>
          </div>

          {posts.length === 0 ? (
            <div className="no-posts">
              <div className="emoji">📝</div>
              <p>No posts yet. Add posts in WordPress Admin.</p>
              <Link href="http://wp-blog.local/wp-admin/post-new.php" target="_blank" className="btn-primary" style={{ marginTop: '20px', display: 'inline-flex' }}>
                Add First Post →
              </Link>
            </div>
          ) : (
            <div className="posts-grid">
              {featured && <PostCard post={featured} featured />}
              {rest.map(post => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CATEGORIES */}
      {categories.length > 0 && (
        <section style={{ padding: '0 0 80px' }}>
          <div className="container">
            <div className="section-header">
              <div>
                <span className="section-tag">Browse</span>
                <h2 className="section-title">Categories</h2>
              </div>
            </div>
            <div className="category-filter">
              {categories.map(cat => (
                <Link key={cat.id} href={`/category/${cat.slug}`} className="cat-btn">
                  {cat.name} ({cat.count})
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* JOIN COMMUNITY CTA */}
      <section style={{ padding: '0 0 100px' }}>
        <div className="container">
          <div className="join-cta">
            <div className="join-cta-icon">✍️</div>
            <h2 className="join-cta-title">
              Got Something to Share?
            </h2>
            <p className="join-cta-desc">
              Join our community of writers. Create your free account and start publishing
              your articles — reach readers who care about web development.
            </p>
            <div className="hero-cta" style={{ justifyContent: 'center' }}>
              <Link
                href="http://wp-blog.local/wp-login.php?action=register"
                target="_blank"
                className="btn-primary"
              >
                🚀 Create Free Account
              </Link>
              <Link href="/authors" className="btn-outline">
                Meet Our Authors →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
