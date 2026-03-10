<?php
/**
 * Add Sample Blog Posts for Headless WP + Next.js Demo
 * URL: http://wp-blog.local/wp-content/add-blog-posts.php
 * Run once then DELETE!
 */
require_once(dirname(__FILE__) . '/../wp-load.php');

echo '<style>body{font-family:monospace;max-width:800px;margin:40px auto;padding:20px;background:#0a0a0f;color:#e2e2f0;}
.ok{color:#4caf50;} .err{color:#f44336;} .info{color:#7c6cfa;} h2{color:#7c6cfa;border-bottom:1px solid #333;padding-bottom:8px;margin:24px 0 16px;}
</style><h1 style="color:#fa6c8a;">📝 Adding Blog Posts for Next.js Demo</h1>';

// Categories
$categories = [
    ['name' => 'WordPress', 'slug' => 'wordpress'],
    ['name' => 'JavaScript', 'slug' => 'javascript'],
    ['name' => 'Next.js', 'slug' => 'nextjs'],
    ['name' => 'Web Dev', 'slug' => 'web-dev'],
];

echo '<h2>Step 1: Categories</h2>';
$cat_ids = [];
foreach ($categories as $cat) {
    $existing = get_term_by('slug', $cat['slug'], 'category');
    if ($existing) {
        $cat_ids[$cat['slug']] = $existing->term_id;
        echo "<p class='info'>ℹ️ '{$cat['name']}' already exists (ID: {$existing->term_id})</p>";
    }
    else {
        $result = wp_insert_term($cat['name'], 'category', ['slug' => $cat['slug']]);
        if (!is_wp_error($result)) {
            $cat_ids[$cat['slug']] = $result['term_id'];
            echo "<p class='ok'>✅ Created '{$cat['name']}' (ID: {$result['term_id']})</p>";
        }
    }
}

// Posts
$posts = [
    [
        'title' => 'Building a Headless WordPress Site with Next.js',
        'slug' => 'headless-wordpress-nextjs',
        'cats' => ['wordpress', 'nextjs'],
        'content' => '<p>Headless WordPress is a modern approach where WordPress handles content management while a separate frontend framework like Next.js renders the site. This decoupled architecture gives you the best of both worlds.</p>
<h2>What is Headless WordPress?</h2>
<p>In traditional WordPress, the same system manages both content and presentation. In headless mode, WordPress acts purely as a content backend accessed via its REST API, while the frontend is completely separate.</p>
<h2>Why Choose This Stack?</h2>
<ul>
<li><strong>Performance</strong>: Next.js static generation = ultra-fast pages</li>
<li><strong>Flexibility</strong>: Use any frontend framework you prefer</li>
<li><strong>Security</strong>: WordPress admin is hidden from the public</li>
</ul>
<h2>Setting Up the WP REST API</h2>
<p>WordPress comes with a built-in REST API available at <code>/wp-json/wp/v2/</code>.</p>
<pre><code>fetch("https://yoursite.com/wp-json/wp/v2/posts?_embed=true")</code></pre>
<blockquote>The WP REST API turns any WordPress installation into a headless CMS instantly.</blockquote>',
    ],
    [
        'title' => 'WordPress Custom Theme Development — From Scratch',
        'slug' => 'wordpress-custom-theme-scratch',
        'cats' => ['wordpress', 'web-dev'],
        'content' => '<p>Creating a custom WordPress theme from scratch is one of the most valuable skills a web developer can have. It gives you complete control over design, performance, and functionality.</p>
<h2>Essential Theme Files</h2>
<ul>
<li><code>style.css</code> — Theme metadata + all your CSS</li>
<li><code>index.php</code> — Main template file</li>
<li><code>functions.php</code> — Theme setup, scripts, CPTs</li>
</ul>
<h2>The Template Hierarchy</h2>
<p>WordPress uses a specific order to find templates. Understanding this is key to becoming a theme developer.</p>
<pre><code>single.php → archive.php → index.php</code></pre>',
    ],
    [
        'title' => 'Next.js App Router — Complete Beginners Guide',
        'slug' => 'nextjs-app-router-guide',
        'cats' => ['nextjs', 'javascript'],
        'content' => '<p>Next.js 13+ introduced the App Router, a revolutionary way to build React applications with server components, layouts, and streaming built-in.</p>
<h2>File-Based Routing</h2>
<pre><code>app/
├── page.tsx          → /
├── blog/
│   ├── page.tsx      → /blog
│   └── [slug]/page.tsx → /blog/:slug
└── layout.tsx        → Shared layout</code></pre>
<h2>Server Components by Default</h2>
<p>All components are Server Components by default in the App Router. They run on the server, can access databases, and send minimal JavaScript to the client.</p>
<blockquote>Once you understand Server Components, you will never want to go back.</blockquote>',
    ],
    [
        'title' => 'WooCommerce — Building a Pakistani Clothing Store',
        'slug' => 'woocommerce-clothing-store-pakistan',
        'cats' => ['wordpress', 'web-dev'],
        'content' => '<p>Building an e-commerce store with WooCommerce is one of the most practical WordPress skills. In this post, I document building SK Fashion — a complete clothing store for the Pakistani market.</p>
<h2>Project Features</h2>
<ul>
<li>Men, Women, Kids, and Sale categories</li>
<li>Custom product pages with Pakistani Rupee (Rs.) pricing</li>
<li>Cash on Delivery payment method</li>
<li>Complete cart and checkout flow</li>
</ul>
<h2>Custom Template Files</h2>
<pre><code>woocommerce.php     → Master template
archive-product.php → Shop page
single-product.php  → Product page</code></pre>',
    ],
    [
        'title' => 'JavaScript ES2024 — Top 5 Features You Should Know',
        'slug' => 'javascript-es2024-features',
        'cats' => ['javascript', 'web-dev'],
        'content' => '<p>JavaScript continues to evolve rapidly. ES2024 brought several exciting features that make development more powerful and ergonomic.</p>
<h2>1. Array Grouping</h2>
<pre><code>const grouped = Object.groupBy(products, p => p.category);</code></pre>
<h2>2. Promise.withResolvers()</h2>
<pre><code>const { promise, resolve, reject } = Promise.withResolvers();
setTimeout(() => resolve("Done!"), 1000);</code></pre>
<h2>3. Set Methods</h2>
<p>Sets now support union, intersection, and difference operations natively.</p>
<blockquote>JavaScript in 2024 feels like a completely different language from 2015.</blockquote>',
    ],
];

echo '<h2>Step 2: Adding Posts</h2>';
foreach ($posts as $pdata) {
    $existing = get_page_by_path($pdata['slug'], OBJECT, 'post');
    if ($existing) {
        echo "<p class='info'>ℹ️ '{$pdata['title']}' already exists</p>";
        continue;
    }
    $cat_term_ids = array_values(array_filter(array_map(fn($s) => $cat_ids[$s] ?? 0, $pdata['cats'])));
    $id = wp_insert_post([
        'post_title' => $pdata['title'],
        'post_name' => $pdata['slug'],
        'post_content' => $pdata['content'],
        'post_excerpt' => wp_trim_words(strip_tags($pdata['content']), 25),
        'post_status' => 'publish',
        'post_author' => 1,
        'post_category' => $cat_term_ids,
    ]);
    if (is_wp_error($id)) {
        echo "<p class='err'>❌ Failed: {$pdata['title']}</p>";
    }
    else {
        echo "<p class='ok'>✅ Created: '{$pdata['title']}' (ID: $id)</p>";
    }
}

// Also enable CORS for Next.js
echo '<h2>Step 3: Enabling CORS for Next.js</h2>';
$cors_code = "add_action('rest_api_init', function() {\n  remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');\n  add_filter('rest_pre_serve_request', function(\$value) {\n    header('Access-Control-Allow-Origin: http://localhost:3000');\n    header('Access-Control-Allow-Methods: GET');\n    return \$value;\n  });\n}, 15);";

// Write to mu-plugins for persistent CORS
$mu_dir = WP_CONTENT_DIR . '/mu-plugins';
if (!file_exists($mu_dir))
    mkdir($mu_dir, 0755, true);
file_put_contents($mu_dir . '/cors-for-nextjs.php', "<?php\n// CORS for Next.js Headless Blog\n$cors_code\n");
echo "<p class='ok'>✅ CORS enabled for localhost:3000</p>";

echo '<h2 style="color:#4caf50;">🎉 All Done!</h2>';
echo '<p>Your wp-blog.local WordPress is ready for the Next.js frontend!</p>';
echo '<p><a href="http://wp-blog.local/wp-admin/edit.php" style="color:#7c6cfa;">→ View Posts in WP Admin</a></p>';
echo '<p style="color:#f44336;margin-top:24px;"><strong>⚠️ DELETE this file:</strong><br>C:/Users/sikan/Local Sites/wp-blog/app/public/wp-content/add-blog-posts.php</p>';
