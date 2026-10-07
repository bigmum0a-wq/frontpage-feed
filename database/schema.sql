-- =========================================================
-- FRONTPAGE — DATABASE SCHEMA (SQLITE / POSTGRESQL COMPATIBLE)
-- =========================================================

-- Enable foreign keys support
PRAGMA foreign_keys = ON;

-- =========================================================
-- 1. USERS & ACCOUNTS
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                       -- UUID / unique identifier
    email TEXT UNIQUE NOT NULL,                -- User email address
    password_hash TEXT,                        -- NULL for guest sessions or OAuth
    name TEXT NOT NULL DEFAULT 'User',         -- Display name
    avatar_url TEXT,                           -- Avatar picture URL
    is_guest BOOLEAN NOT NULL DEFAULT 0,       -- 1 for guest sessions, 0 for permanent
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 2. CATEGORIES
-- =========================================================
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,                       -- e.g. 'frontend', 'design', 'ai-ml'
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                        -- Category label (e.g. 'Frontend')
    color TEXT DEFAULT '#2563eb',              -- Accent color hex
    background TEXT DEFAULT '#dbeafe',         -- Pill background hex
    sort_order INTEGER DEFAULT 0,              -- Manual sorting position
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 3. FEEDS (RSS / ATOM SOURCES)
-- =========================================================
CREATE TABLE IF NOT EXISTS feeds (
    id TEXT PRIMARY KEY,                       -- Unique slug or UUID
    url TEXT UNIQUE NOT NULL,                  -- Target feed XML / Atom URL
    site_url TEXT,                             -- Website home URL
    title TEXT NOT NULL,                       -- Feed title (e.g. 'Smashing Magazine')
    description TEXT,                          -- Feed description
    format TEXT DEFAULT 'rss2',                -- 'rss2', 'atom', 'rss1', 'json'
    initials TEXT,                             -- 1-2 letters badge (e.g. 'SM')
    color TEXT,                                -- Hex color badge (e.g. '#e53e3e')
    favicon_url TEXT,                          -- Favicon URL
    etag TEXT,                                 -- HTTP ETag for 304 conditional get
    last_modified_header TEXT,                 -- HTTP Last-Modified header
    last_fetched_at DATETIME,                  -- Last fetch attempt timestamp
    last_successful_fetch_at DATETIME,         -- Last successful parse timestamp
    health_status TEXT DEFAULT 'active',       -- 'active', 'stale', 'error'
    error_message TEXT,                        -- Last error message if failed
    fetch_error_count INTEGER DEFAULT 0,       -- Consecutive error count
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 4. USER FEEDS (SUBSCRIPTIONS)
-- =========================================================
CREATE TABLE IF NOT EXISTS user_feeds (
    id TEXT PRIMARY KEY,                       -- Subscription ID
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    custom_title TEXT,                         -- User rename alias
    is_favorite BOOLEAN DEFAULT 0,
    subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, feed_id)
);

-- =========================================================
-- 5. ARTICLES (FEED ITEMS)
-- =========================================================
CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,                       -- Hash or UUID of (feed_id + guid)
    feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
    guid TEXT NOT NULL,                        -- Original feed item GUID / id / permalink
    url TEXT NOT NULL,                         -- Article link URL
    title TEXT NOT NULL,                       -- Article title
    excerpt TEXT,                              -- Short plain-text summary
    content TEXT,                              -- Full sanitized HTML article body
    author TEXT,                               -- Author name
    image_url TEXT,                            -- Lead image / thumbnail
    published_at DATETIME NOT NULL,            -- Publication date
    ai_summary TEXT,                           -- AI-generated TL;DR / summary
    ai_takeaways TEXT,                         -- JSON array of key takeaways
    ai_tags TEXT,                              -- JSON array of semantic tags (e.g. ["#React", "#CSS"])
    ai_reading_time INTEGER,                   -- Estimated reading time in minutes
    ai_generated_at DATETIME,                  -- When AI summary was generated
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(feed_id, guid)
);

-- =========================================================
-- 6. USER ARTICLES (READ & BOOKMARK STATES)
-- =========================================================
CREATE TABLE IF NOT EXISTS user_articles (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT 0,        -- Read status
    read_at DATETIME,                          -- When article was read
    is_saved BOOLEAN NOT NULL DEFAULT 0,       -- Bookmark status
    saved_at DATETIME,                         -- When article was saved
    PRIMARY KEY (user_id, article_id)
);

-- =========================================================
-- 7. USER PREFERENCES
-- =========================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'system',               -- 'system', 'light', 'dark'
    accent_color TEXT DEFAULT '#2563eb',
    feed_layout TEXT DEFAULT 'list',           -- 'list', 'grid', 'magazine', 'split'
    display_density TEXT DEFAULT 'comfortable',-- 'comfortable', 'compact', 'dense'
    reader_font TEXT DEFAULT 'serif',          -- 'serif', 'sans', 'mono', 'opendyslexic'
    text_size TEXT DEFAULT 'normal',           -- 'small', 'normal', 'large', 'xlarge'
    reader_line_height TEXT DEFAULT 'normal',  -- 'tight', 'normal', 'loose'
    reader_column_width TEXT DEFAULT 'medium', -- 'narrow', 'medium', 'wide'
    refresh_interval TEXT DEFAULT 'manual',    -- 'manual', '15', '30', '60'
    wifi_only_sync BOOLEAN DEFAULT 0,
    mark_read_on TEXT DEFAULT 'open',          -- 'open', 'scroll'
    filter_duplicates BOOLEAN DEFAULT 1,
    auto_purge_days TEXT DEFAULT '30',         -- '7', '30', '90', 'never'
    enable_ai_summary BOOLEAN DEFAULT 1,
    ai_summary_style TEXT DEFAULT 'keypoints', -- 'keypoints', 'short', 'analytical'
    digest_time TEXT DEFAULT '08:00',
    vim_shortcuts BOOLEAN DEFAULT 1,
    high_contrast BOOLEAN DEFAULT 0,
    reduced_motion BOOLEAN DEFAULT 0,
    emphasize_unread BOOLEAN DEFAULT 1,
    visual_indicators BOOLEAN DEFAULT 0,
    browser_notifications BOOLEAN DEFAULT 0,
    notify_keywords TEXT DEFAULT '',
    email_digest BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 8. INDEXES FOR PERFORMANCE OPTIMIZATION
-- =========================================================

-- Articles index for reverse-chronological feeds & per-feed queries
CREATE INDEX IF NOT EXISTS idx_articles_published 
    ON articles(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_articles_feed_published 
    ON articles(feed_id, published_at DESC);

-- Fast unread counts & saved queries per user
CREATE INDEX IF NOT EXISTS idx_user_articles_read 
    ON user_articles(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_user_articles_saved 
    ON user_articles(user_id, is_saved);

-- Fast user feeds filtering by category
CREATE INDEX IF NOT EXISTS idx_user_feeds_category 
    ON user_feeds(user_id, category_id);

CREATE INDEX IF NOT EXISTS idx_feeds_url 
    ON feeds(url);
