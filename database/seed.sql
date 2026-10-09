-- =========================================================
-- FRONTPAGE — SEED DATA (INITIAL CATEGORIES, FEEDS & ARTICLES)
-- =========================================================

-- 1. Default Guest User
INSERT OR IGNORE INTO users (id, email, name, is_guest) VALUES
('guest-user-001', 'guest@frontpage.local', 'Invité', 1);

-- 2. Initial Categories
INSERT OR IGNORE INTO categories (id, user_id, name, color, background, sort_order) VALUES
('frontend', 'guest-user-001', 'Frontend', '#2563eb', '#dbeafe', 1),
('design', 'guest-user-001', 'Design', '#db2777', '#fce7f3', 2),
('backend-devops', 'guest-user-001', 'Backend & DevOps', '#d97706', '#fef3c7', 3),
('general-tech', 'guest-user-001', 'General Tech', '#4f46e5', '#e0e7ff', 4),
('ai-ml', 'guest-user-001', 'AI & ML', '#7c3aed', '#ede9fe', 5);

-- 3. Curated Starter Feeds (19 feeds from sample data)
INSERT OR IGNORE INTO feeds (id, url, site_url, title, description, format, initials, color) VALUES
-- Frontend
('css-tricks', 'https://css-tricks.com/feed/', 'https://css-tricks.com/', 'CSS-Tricks', 'Tips, Tricks, and Techniques on using Cascading Style Sheets.', 'rss2', 'CT', '#ff6600'),
('smashing-magazine', 'https://www.smashingmagazine.com/feed/', 'https://www.smashingmagazine.com/', 'Smashing Magazine', 'For web designers and developers.', 'rss2', 'SM', '#e53e3e'),
('josh-comeau', 'https://www.joshwcomeau.com/rss.xml', 'https://www.joshwcomeau.com/', 'Josh W. Comeau', 'Friendly tutorials for developers.', 'rss2', 'JC', '#5b5ce2'),
('kent-c-dodds', 'https://kentcdodds.com/blog/rss.xml', 'https://kentcdodds.com/', 'Kent C. Dodds', 'Helping people make the world a better place through quality software.', 'rss2', 'KD', '#2085ec'),
('web-dev', 'https://web.dev/feed.xml', 'https://web.dev/', 'web.dev', 'Building a better web, together.', 'atom', 'WD', '#3367d6'),
('mdn-blog', 'https://developer.mozilla.org/en-US/blog/rss.xml', 'https://developer.mozilla.org/en-US/blog/', 'MDN Blog', 'The MDN Web Docs blog.', 'rss2', 'MD', '#1b1b1b'),

-- Design
('sidebar-io', 'https://sidebar.io/feed.xml', 'https://sidebar.io/', 'Sidebar.io', 'The five best design links, every day.', 'atom', 'SB', '#ee5a24'),
('nngroup', 'https://www.nngroup.com/feed/rss/', 'https://www.nngroup.com/', 'Nielsen Norman Group', 'Evidence-based user experience research and consulting.', 'rss2', 'NN', '#0097a7'),
('figma-blog', 'https://www.figma.com/blog/feed/atom.xml', 'https://www.figma.com/blog/', 'Figma Blog', 'Stories, news, and design thinking from the Figma team.', 'atom', 'FB', '#f24e1e'),
('alistapart', 'https://alistapart.com/main/feed/', 'https://alistapart.com/', 'A List Apart', 'For people who make websites.', 'rss2', 'AL', '#2c3e50'),
('ux-collective', 'https://uxdesign.cc/feed', 'https://uxdesign.cc/', 'UX Collective', 'Curated stories on user experience and design.', 'rss2', 'UX', '#111111'),

-- Backend & DevOps
('cloudflare-blog', 'https://blog.cloudflare.com/rss/', 'https://blog.cloudflare.com/', 'Cloudflare Blog', 'The official blog of Cloudflare.', 'rss2', 'CF', '#f38020'),
('vercel-blog', 'https://vercel.com/atom', 'https://vercel.com/blog', 'Vercel Blog', 'Frontend development and edge infrastructure updates.', 'atom', 'VB', '#000000'),
('github-blog', 'https://github.blog/feed/', 'https://github.blog/', 'The GitHub Blog', 'Updates, insights, and news from GitHub.', 'rss2', 'GH', '#24292e'),
('netlify-blog', 'https://www.netlify.com/feed.xml', 'https://www.netlify.com/blog/', 'Netlify Blog', 'Modern web development, Jamstack, and developer experience.', 'rss2', 'NL', '#00ad9f'),

-- General Tech
('pragmatic-engineer', 'https://newsletter.pragmaticengineer.com/feed', 'https://newsletter.pragmaticengineer.com/', 'The Pragmatic Engineer', 'Big tech and high-growth startups, from the inside.', 'rss2', 'PE', '#3b82f6'),
('hacker-news', 'https://hnrss.org/frontpage', 'https://news.ycombinator.com/best', 'Hacker News Best', 'Highest-rated links and discussions on Hacker News.', 'rss2', 'HN', '#ff6600'),

-- AI & ML
('simon-willison', 'https://simonwillison.net/atom/everything/', 'https://simonwillison.net/', "Simon Willison's Weblog", 'Web development, Python, LLMs, and AI research notes.', 'atom', 'SW', '#7c3aed'),
('hugging-face', 'https://huggingface.co/blog/feed.xml', 'https://huggingface.co/blog', 'Hugging Face Blog', 'The latest news in machine learning and open source models.', 'atom', 'HF', '#ffd21e');

-- 4. Assign Default Feeds to Guest User
INSERT OR IGNORE INTO user_feeds (id, user_id, feed_id, category_id) VALUES
('uf-01', 'guest-user-001', 'smashing-magazine', 'frontend'),
('uf-02', 'guest-user-001', 'josh-comeau', 'frontend'),
('uf-03', 'guest-user-001', 'css-tricks', 'frontend'),
('uf-04', 'guest-user-001', 'kent-c-dodds', 'frontend'),
('uf-05', 'guest-user-001', 'web-dev', 'frontend'),
('uf-06', 'guest-user-001', 'mdn-blog', 'frontend'),
('uf-07', 'guest-user-001', 'figma-blog', 'design'),
('uf-08', 'guest-user-001', 'sidebar-io', 'design'),
('uf-09', 'guest-user-001', 'nngroup', 'design'),
('uf-10', 'guest-user-001', 'alistapart', 'design'),
('uf-11', 'guest-user-001', 'ux-collective', 'design'),
('uf-12', 'guest-user-001', 'cloudflare-blog', 'backend-devops'),
('uf-13', 'guest-user-001', 'vercel-blog', 'backend-devops'),
('uf-14', 'guest-user-001', 'github-blog', 'backend-devops'),
('uf-15', 'guest-user-001', 'netlify-blog', 'backend-devops'),
('uf-16', 'guest-user-001', 'pragmatic-engineer', 'general-tech'),
('uf-17', 'guest-user-001', 'hacker-news', 'general-tech'),
('uf-18', 'guest-user-001', 'simon-willison', 'ai-ml'),
('uf-19', 'guest-user-001', 'hugging-face', 'ai-ml');

-- 5. Seed Initial Articles
INSERT OR IGNORE INTO articles (id, feed_id, guid, url, title, excerpt, content, author, published_at) VALUES
('art-01', 'smashing-magazine', 'sm-colorblind-2026', 'https://www.smashingmagazine.com/2026/09/colorblind-users/',
 'Practical Guide to Designing for Colorblind Users',
 'Color blindness affects roughly 8% of men and 0.5% of women worldwide. Here is how to design interfaces that work for everyone.',
 '<p>Color blindness affects roughly 8% of men and 0.5% of women worldwide. Here is how to design interfaces that work for everyone.</p><p>Using distinct shapes, high contrast ratios, and accessible color palettes ensures that vital feedback and actions remain obvious to all users.</p>',
 'Vitaly Friedman', '2026-09-05 08:00:00'),

('art-02', 'cloudflare-blog', 'cf-edge-cache-2026', 'https://blog.cloudflare.com/edge-caching-p99/',
 'How We Reduced P99 Latency by 60% with Edge-First Caching',
 'Our engineering team spent the last quarter rethinking how we cache at the edge, with dramatic results for customers.',
 '<p>Our engineering team spent the last quarter rethinking how we cache at the edge, with dramatic results for customers.</p><p>By migrating cache coordination to lightweight regional workers, cold cache misses were virtually eliminated.</p>',
 'Cloudflare Engineering', '2026-09-05 07:00:00'),

('art-03', 'simon-willison', 'sw-rag-systems-2026', 'https://simonwillison.net/2026/rag-systems-production/',
 'Building Effective RAG Systems: What Actually Works in Production',
 'After months of experimenting with retrieval-augmented generation, here is what I have learned about making systems reliable.',
 '<p>After months of experimenting with retrieval-augmented generation, here is what I have learned about making systems reliable.</p><p>Chunking strategy, semantic re-ranking, and strict context pruning matter far more than model size alone.</p>',
 'Simon Willison', '2026-09-05 06:00:00'),

('art-04', 'josh-comeau', 'jc-container-queries-2026', 'https://www.joshwcomeau.com/css/container-queries/',
 'The Surprising Truth About CSS Container Queries',
 'Container queries have been available for a while, but most developers are still using them like media queries.',
 '<p>Container queries have been available for a while, but most developers are still using them like media queries.</p><p>Learn how to think in terms of component boundaries rather than viewport dimensions.</p>',
 'Josh W. Comeau', '2026-09-05 05:00:00'),

('art-05', 'figma-blog', 'fb-variables-2026', 'https://www.figma.com/blog/variables-2-0/',
 'Introducing Variables 2.0: Design Tokens Meet Real Logic',
 'Variables now support conditional logic, mathematical expressions, and cross-file references for richer design systems.',
 '<p>Variables now support conditional logic, mathematical expressions, and cross-file references for richer design systems.</p>',
 'Figma Design Team', '2026-09-05 04:00:00'),

('art-06', 'hacker-news', 'hn-thoughtful-rss-2026', 'https://news.ycombinator.com/item?id=3847291',
 'Why a Thoughtful RSS Reader Still Matters',
 'A calm place to read can be more valuable than another algorithmic feed competing for your attention.',
 '<p>A calm place to read can be more valuable than another algorithmic feed competing for your attention. Curating your own sources fosters deep focus.</p>',
 'dang', '2026-09-04 17:00:00');

-- 6. Initial User Article Status (Read & Saved States)
INSERT OR IGNORE INTO user_articles (user_id, article_id, is_read, read_at, is_saved, saved_at) VALUES
('guest-user-001', 'art-01', 0, NULL, 0, NULL),
('guest-user-001', 'art-02', 0, NULL, 1, '2026-09-05 09:00:00'),
('guest-user-001', 'art-03', 0, NULL, 0, NULL),
('guest-user-001', 'art-04', 0, NULL, 0, NULL),
('guest-user-001', 'art-05', 1, '2026-09-05 06:30:00', 0, NULL),
('guest-user-001', 'art-06', 1, '2026-09-04 18:00:00', 1, '2026-09-04 18:05:00');

-- 7. Initial User Preferences
INSERT OR IGNORE INTO user_preferences (user_id, theme, accent_color, feed_layout, reader_font, text_size) VALUES
('guest-user-001', 'system', '#2563eb', 'list', 'serif', 'normal');
