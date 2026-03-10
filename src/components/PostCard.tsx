import Link from 'next/link';
import { WPPost, formatDate, stripHtml } from '@/lib/wordpress';

interface Props {
    post: WPPost;
    featured?: boolean;
}

export default function PostCard({ post, featured = false }: Props) {
    const title = post.title.rendered;
    const excerpt = stripHtml(post.excerpt.rendered).slice(0, 150) + '...';
    const date = formatDate(post.date);
    const image = post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
    const imgAlt = post._embedded?.['wp:featuredmedia']?.[0]?.alt_text || title;
    const cats = post._embedded?.['wp:term']?.[0] ?? [];
    const author = post._embedded?.author?.[0]?.name ?? 'Sikandar Abbas';

    if (featured) {
        return (
            <article className="post-card featured-post">
                <div className="post-card-image">
                    {image
                        ? <img src={image} alt={imgAlt} />
                        : <div className="post-card-image-placeholder">✍️</div>
                    }
                </div>
                <div className="post-card-body">
                    <div className="featured-badge">⭐ Featured Post</div>
                    <div className="post-meta">
                        {cats.slice(0, 2).map(cat => (
                            <Link key={cat.id} href={`/category/${cat.slug}`} className="category-badge">
                                {cat.name}
                            </Link>
                        ))}
                        <span className="post-date">📅 {date}</span>
                    </div>
                    <Link href={`/blog/${post.slug}`}>
                        <h2 className="post-card-title">{title}</h2>
                    </Link>
                    <p className="post-card-excerpt">{excerpt}</p>
                    <div className="post-meta" style={{ marginTop: 'auto', marginBottom: 0 }}>
                        <Link href={`/blog/${post.slug}`} className="read-more">Read Article →</Link>
                        <span className="post-date" style={{ marginLeft: 'auto' }}>✍️ {author}</span>
                    </div>
                </div>
            </article>
        );
    }

    return (
        <article className="post-card">
            <Link href={`/blog/${post.slug}`} className="post-card-image">
                {image
                    ? <img src={image} alt={imgAlt} />
                    : <div className="post-card-image-placeholder">📝</div>
                }
            </Link>
            <div className="post-card-body">
                <div className="post-meta">
                    {cats.slice(0, 1).map(cat => (
                        <Link key={cat.id} href={`/category/${cat.slug}`} className="category-badge">
                            {cat.name}
                        </Link>
                    ))}
                    <span className="post-date">📅 {date}</span>
                </div>
                <Link href={`/blog/${post.slug}`}>
                    <h3 className="post-card-title">{title}</h3>
                </Link>
                <p className="post-card-excerpt">{excerpt}</p>
                <Link href={`/blog/${post.slug}`} className="read-more">
                    Read more →
                </Link>
            </div>
        </article>
    );
}
