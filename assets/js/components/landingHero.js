// assets/js/components/landingHero.js
import { isGuestUser, getCurrentUser, loginUser, registerUser } from '../services/authService.js';
import { showToast } from './toast.js';

const CURATED_SOURCES_DATA = [
  { name: 'CSS-Tricks', category: 'Frontend', icon: '🎨', desc: 'Daily articles about CSS, HTML, JavaScript, and web design.', url: 'https://css-tricks.com' },
  { name: 'Smashing Magazine', category: 'Frontend', icon: '⚡', desc: 'For web designers and developers since 2006.', url: 'https://smashingmagazine.com' },
  { name: 'web.dev', category: 'Frontend', icon: '🌐', desc: 'Guidance and analysis from the Google Chrome team.', url: 'https://web.dev' },
  { name: 'Overreacted', category: 'Frontend', icon: '💻', desc: 'Personal blog by Dan Abramov on React & architecture.', url: 'https://overreacted.io' },
  { name: 'GitHub Blog', category: 'Backend & DevOps', icon: '🐙', desc: 'Updates, engineering stories, and changelogs from GitHub.', url: 'https://github.blog' },
  { name: 'Simon Willison', category: 'AI & ML', icon: '🤖', desc: 'Deep dive into LLMs, prompt engineering, and open-source AI.', url: 'https://simonwillison.net' },
  { name: 'MDN Web Docs', category: 'Frontend', icon: '🛠️', desc: 'Resources for developers, by developers.', url: 'https://developer.mozilla.org' },
  { name: 'Android Developers', category: 'Mobile', icon: '📱', desc: 'Official Android news, Jetpack Compose, and Kotlin tutorials.', url: 'https://android-developers.googleblog.com' },
  { name: 'Sidebar.io', category: 'Design & UX', icon: '📐', desc: 'The 5 best design links, curated every day.', url: 'https://sidebar.io' },
  { name: 'Ars Technica', category: 'Tech News', icon: '📰', desc: 'In-depth technology news, analysis, and scientific reviews.', url: 'https://arstechnica.com' },
  { name: 'Hacker News (Best)', category: 'Tech News', icon: '🔥', desc: 'Top tech, programming, and startup community discussions.', url: 'https://news.ycombinator.com' },
  { name: 'Martin Fowler', category: 'Backend & DevOps', icon: '🏛️', desc: 'Software architecture, refactoring, and agile principles.', url: 'https://martinfowler.com' },
];

export function renderLandingPage() {
  const container = document.querySelector('#main-content');
  if (!container) return;

  const isGuest = isGuestUser();
  const user = getCurrentUser();

  const landing = document.createElement('div');
  landing.className = 'landing-fullscreen-view';

  landing.innerHTML = `
    <!-- 1. DEDICATED LANDING NAVBAR -->
    <header class="landing-navbar">
      <div class="landing-nav-brand">
        <a href="#welcome" class="landing-nav-logo">
          <img src="assets/icons/fontpage-logo.svg" alt="" class="landing-logo-img">
          <span class="landing-logo-text">FrontPage</span>
        </a>
        <span class="landing-version-tag">v1.0 · Open Web</span>
      </div>

      <nav class="landing-nav-links">
        <a href="#landing-features">Features</a>
        <a href="#landing-sources">Curated Feeds</a>
        <a href="#landing-how">How it Works</a>
        <a href="#landing-why">Why RSS?</a>
      </nav>

      <div class="landing-nav-actions">
        <button type="button" class="btn btn-sm btn-ghost btn-landing-guest-nav">
          Try as Guest →
        </button>
        <button type="button" class="btn btn-sm btn-primary btn-landing-signin-nav">
          ${isGuest ? 'Sign In' : `Account (${user?.name || 'Reader'})`}
        </button>
      </div>
    </header>

    <!-- 2. SPLIT HERO SECTION WITH EMBEDDED ACTION HUB -->
    <section class="landing-hero-section">
      <div class="landing-hero-container">
        <!-- LEFT: HEADLINE + VALUE PROP + EMBEDDED AUTH HUB -->
        <div class="landing-hero-left">
          <div class="landing-hero-eyebrow">
            <span class="eyebrow-dot"></span>
            <span>The Calm Front Page for Tech Content</span>
          </div>

          <h1 class="landing-hero-title">
            Your tech world.<br>
            <span class="title-gradient">Zero algorithms. Zero noise.</span>
          </h1>

          <p class="landing-hero-description">
            Aggregate dev blogs, engineering changelogs, newsletters, and design publications into a calm, chronological reading dashboard. Fully customizable, AI-synthesized, and offline-first.
          </p>

          <!-- EMBEDDED ACTION CARD (THE HUB) -->
          <div class="hero-auth-card" id="hero-auth-hub">
            <div class="hero-card-tabs" role="tablist">
              <button type="button" class="hero-card-tab is-active" data-tab="guest" role="tab">
                ⚡ Try as Guest (Instant)
              </button>
              <button type="button" class="hero-card-tab" data-tab="register" role="tab">
                Create Account
              </button>
              <button type="button" class="hero-card-tab" data-tab="login" role="tab">
                Sign In
              </button>
            </div>

            <!-- TAB PANE: GUEST (DEFAULT) -->
            <div class="hero-tab-pane is-active" id="pane-guest">
              <div class="pane-content">
                <div class="pane-header">
                  <h3>Explore FrontPage right now</h3>
                  <p>Pre-loaded with 19 curated tech sources across Frontend, Backend, AI, Mobile, and Design. No registration needed.</p>
                </div>
                <button type="button" class="btn btn-primary btn-lg btn-block btn-launch-guest">
                  ⚡ Launch Guest Dashboard Now →
                </button>
                <div class="pane-footer-note">
                  <span>🔒 100% private in this browser</span>
                  <span>·</span>
                  <a href="#welcome" class="switch-to-login">Already have an account? Sign In</a>
                </div>
              </div>
            </div>

            <!-- TAB PANE: REGISTER -->
            <div class="hero-tab-pane" id="pane-register" hidden>
              <form class="hero-auth-form" id="hero-register-form">
                <div class="hero-field">
                  <label for="hero-reg-name">Full name</label>
                  <input type="text" id="hero-reg-name" placeholder="Ada Lovelace" required>
                </div>
                <div class="hero-field">
                  <label for="hero-reg-email">Email address</label>
                  <input type="email" id="hero-reg-email" placeholder="ada@example.com" required>
                </div>
                <div class="hero-field">
                  <label for="hero-reg-password">Password</label>
                  <input type="password" id="hero-reg-password" placeholder="Minimum 6 characters" minlength="6" required>
                </div>
                <div class="hero-form-error" id="hero-reg-error" hidden></div>
                <button type="submit" class="btn btn-primary btn-lg btn-block" id="hero-reg-submit">
                  Create Free Account &amp; Sync →
                </button>
                <p class="pane-subtext">Free forever · Feeds synced to SQLite database</p>
              </form>
            </div>

            <!-- TAB PANE: LOGIN -->
            <div class="hero-tab-pane" id="pane-login" hidden>
              <form class="hero-auth-form" id="hero-login-form">
                <div class="hero-field">
                  <label for="hero-login-email">Email address</label>
                  <input type="email" id="hero-login-email" placeholder="ada@example.com" required>
                </div>
                <div class="hero-field">
                  <label for="hero-login-password">Password</label>
                  <input type="password" id="hero-login-password" placeholder="Your password" required>
                </div>
                <div class="hero-form-error" id="hero-login-error" hidden></div>
                <button type="submit" class="btn btn-primary btn-lg btn-block" id="hero-login-submit">
                  Sign In to Your Account →
                </button>
                <p class="pane-subtext">Demo: <code>demo.reader@example.com</code> / <code>Password123!</code></p>
              </form>
            </div>
          </div>

          <div class="hero-trust-badges">
            <span class="trust-pill">🛡️ Zero Tracking</span>
            <span class="trust-pill">⚡ 100% Chronological</span>
            <span class="trust-pill">📱 Offline PWA</span>
            <span class="trust-pill">📖 EPUB 3 Export</span>
          </div>
        </div>

        <!-- RIGHT: INTERACTIVE LIVE APPLICATION PREVIEW -->
        <div class="landing-hero-right">
          <div class="mockup-window">
            <div class="mockup-window-header">
              <div class="window-controls">
                <span class="control-dot dot-red"></span>
                <span class="control-dot dot-yellow"></span>
                <span class="control-dot dot-green"></span>
              </div>
              <div class="window-url-bar">
                <span class="url-icon">🔒</span>
                <span class="url-text">frontpage.local/feed</span>
              </div>
              <div class="window-badge">Live Preview</div>
            </div>

            <div class="mockup-content">
              <div class="mockup-feed-header">
                <div>
                  <span class="mockup-category-tag">All Subscriptions (19 Feeds)</span>
                  <h4 class="mockup-feed-title">Today's Chronological Feed</h4>
                </div>
                <span class="mockup-badge-unread">24 unread</span>
              </div>

              <div class="mockup-articles-list">
                <article class="mockup-article-card is-featured">
                  <div class="mockup-article-meta">
                    <span class="mockup-source-pill source-css">🎨 CSS-Tricks</span>
                    <span class="mockup-time">12 min ago</span>
                    <span class="mockup-read-time">⏱ 4 min read</span>
                  </div>
                  <h5 class="mockup-article-headline">Modern Fluid Typography and Responsive Spacing with CSS clamp()</h5>
                  <p class="mockup-article-snippet">How to simplify media queries across mobile and ultrawide screens with mathematical functions built into modern browsers.</p>
                  <div class="mockup-article-footer">
                    <span class="mockup-tag">#CSS</span>
                    <span class="mockup-tag">#Frontend</span>
                    <span class="mockup-action-demo">✨ AI Summary ready</span>
                  </div>
                </article>

                <article class="mockup-article-card">
                  <div class="mockup-article-meta">
                    <span class="mockup-source-pill source-ai">🤖 Simon Willison's Log</span>
                    <span class="mockup-time">45 min ago</span>
                    <span class="mockup-read-time">⏱ 3 min read</span>
                  </div>
                  <h5 class="mockup-article-headline">Synthesizing Daily Intelligence Briefings with Local LLMs and RSS</h5>
                  <p class="mockup-article-snippet">Exploring heuristic extraction and automated topic categorization for asynchronous triage of hundreds of feeds.</p>
                  <div class="mockup-article-footer">
                    <span class="mockup-tag">#AI</span>
                    <span class="mockup-tag">#Python</span>
                  </div>
                </article>

                <article class="mockup-article-card">
                  <div class="mockup-article-meta">
                    <span class="mockup-source-pill source-smashing">⚡ Smashing Magazine</span>
                    <span class="mockup-time">2 hours ago</span>
                    <span class="mockup-read-time">⏱ 6 min read</span>
                  </div>
                  <h5 class="mockup-article-headline">Designing Calmer User Interfaces for Readers Who Value Focus</h5>
                  <p class="mockup-article-snippet">Why minimalist typographic rhythm and local-first architecture build lasting reader trust.</p>
                  <div class="mockup-article-footer">
                    <span class="mockup-tag">#Design</span>
                    <span class="mockup-tag">#Typography</span>
                  </div>
                </article>
              </div>

              <div class="mockup-interactive-banner">
                <span>👆 Click below to explore this full dashboard in Guest Mode</span>
                <button type="button" class="btn btn-xs btn-primary btn-mockup-cta">
                  Open Feed Now →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. FEATURE SUPERPOWERS SECTION -->
    <section class="landing-section-features" id="landing-features">
      <div class="landing-section-header">
        <span class="section-eyebrow">Product Architecture</span>
        <h2 class="section-title">Built for readers who value depth over doomscrolling.</h2>
        <p class="section-subtitle">FrontPage strips away the toxic engagement loops of social feeds, giving you back a focused, productive reading workflow.</p>
      </div>

      <div class="features-grid-four">
        <div class="feature-box">
          <div class="feature-icon-bubble">🛡️</div>
          <h3>100% Chronological &amp; Algorithmic-Free</h3>
          <p>No engagement algorithms, no shadowbanning, no outrage bait. You choose what publications you follow, and they appear in the exact chronological order they were published.</p>
          <ul class="feature-bullet-list">
            <li>Direct RSS 2.0 &amp; Atom 1.0 standard parsing</li>
            <li>Zero behavioral tracking or tracking cookies</li>
            <li>Vim shortcuts (j/k navigation, o to open, s to save)</li>
          </ul>
        </div>

        <div class="feature-box">
          <div class="feature-icon-bubble">⚡</div>
          <h3>AI Daily Digest &amp; Heuristic Briefing</h3>
          <p>Short on time? FrontPage analyzes your incoming articles, extracts instant bullet-point TL;DRs, key takeaways, and generates a unified morning briefing so you stay informed in 5 minutes.</p>
          <ul class="feature-bullet-list">
            <li>Automatic key takeaway bullet points</li>
            <li>Custom digest delivery times (e.g. 08:00 AM)</li>
            <li>Audio narration with Web Speech Text-to-Speech</li>
          </ul>
        </div>

        <div class="feature-box">
          <div class="feature-icon-bubble">🌐</div>
          <h3>Instant Live Web Discovery</h3>
          <p>Search any technical publication, engineering blog, or topic directly. FrontPage auto-discovers active RSS and Atom endpoints across the open web and lets you subscribe in a single click.</p>
          <ul class="feature-bullet-list">
            <li>Curated topics: Frontend, AI, Mobile, Design</li>
            <li>OPML 2.0 full import and export</li>
            <li>Live feed health check &amp; auto-refresh</li>
          </ul>
        </div>

        <div class="feature-box">
          <div class="feature-icon-bubble">📖</div>
          <h3>Offline-First PWA &amp; EPUB 3 Magazine</h3>
          <p>Read on the subway, in airplanes, or completely disconnected. Every article is cached by Service Workers, and you can export your unread articles into an EPUB 3 book for your Kindle or Kobo.</p>
          <ul class="feature-bullet-list">
            <li>Service Worker background caching &amp; offline queue</li>
            <li>EPUB 3 archive generator with table of contents</li>
            <li>Distraction-free reader (Serif, Sans, OpenDyslexic)</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 4. CURATED SOURCES SHOWCASE -->
    <section class="landing-section-sources" id="landing-sources">
      <div class="landing-section-header">
        <span class="section-eyebrow">Starter Collection</span>
        <h2 class="section-title">19 Curated Publications Pre-Loaded in Guest Mode</h2>
        <p class="section-subtitle">Jump straight in without configuring a thing. These high-signal tech publications are ready to read the moment you enter.</p>
      </div>

      <div class="sources-showcase-grid">
        ${CURATED_SOURCES_DATA.map((src) => `
          <div class="source-card-showcase">
            <div class="source-card-top">
              <span class="source-icon">${src.icon}</span>
              <span class="source-category-pill">${src.category}</span>
            </div>
            <h4 class="source-name">${src.name}</h4>
            <p class="source-desc">${src.desc}</p>
            <span class="source-url">${src.url.replace('https://', '')}</span>
          </div>
        `).join('')}
      </div>

      <div class="sources-cta-row">
        <button type="button" class="btn btn-primary btn-lg btn-sources-explore">
          Explore All 19 Sources in Guest Mode →
        </button>
      </div>
    </section>

    <!-- 5. HOW IT WORKS -->
    <section class="landing-section-how" id="landing-how">
      <div class="landing-section-header">
        <span class="section-eyebrow">Simplicity by Design</span>
        <h2 class="section-title">How FrontPage Works</h2>
      </div>

      <div class="how-steps-row">
        <div class="step-card">
          <span class="step-number">01</span>
          <h3>Explore or Import</h3>
          <p>Start instantly with our 19 curated tech feeds, search live publications via Discover, or import your existing OPML file from any RSS reader.</p>
        </div>
        <div class="step-card">
          <span class="step-number">02</span>
          <h3>Read Without Friction</h3>
          <p>Read in clean, reader-mode typography with zero cookie popups, zero intrusive banners, and customizable fonts including OpenDyslexic.</p>
        </div>
        <div class="step-card">
          <span class="step-number">03</span>
          <h3>Sync &amp; Export</h3>
          <p>Create a free account to sync your subscriptions and reading activity across devices, or download a magazine EPUB for your e-reader.</p>
        </div>
      </div>
    </section>

    <!-- 6. FINAL CALL TO ACTION BANNER -->
    <section class="landing-final-cta" id="landing-why">
      <div class="final-cta-content">
        <h2>Take back control of your attention.</h2>
        <p>No advertisements, no engagement algorithms, no data selling. Just the open web, delivered cleanly.</p>
        <div class="final-cta-buttons">
          <button type="button" class="btn btn-primary btn-lg btn-final-guest">
            ⚡ Enter Guest Mode (1-Click)
          </button>
          <button type="button" class="btn btn-secondary btn-lg btn-final-signup">
            Create Free Account
          </button>
        </div>
      </div>
    </section>

    <!-- 7. DEDICATED LANDING FOOTER -->
    <footer class="landing-footer">
      <div class="landing-footer-inner">
        <div class="footer-brand">
          <div class="footer-logo">
            <img src="assets/icons/fontpage-logo.svg" alt="" width="24" height="24">
            <strong>FrontPage</strong>
          </div>
          <p>The open, calm front page for developers and tech enthusiasts.</p>
        </div>
        <div class="footer-meta">
          <span>Standards: RSS 2.0 · Atom 1.0 · OPML 2.0 · EPUB 3</span>
          <span>Local-first architecture with SQLite cloud persistence.</span>
        </div>
      </div>
    </footer>
  `;

  // =========================================================
  // ATTACH INTERACTIVE CONTROLS
  // =========================================================

  // 1. Tab Switching on Embedded Action Card
  const tabs = landing.querySelectorAll('.hero-card-tab');
  const panes = landing.querySelectorAll('.hero-tab-pane');

  function switchTab(targetTab) {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.tab === targetTab;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', String(isActive));
    });
    panes.forEach((pane) => {
      const isTarget = pane.id === `pane-${targetTab}`;
      pane.hidden = !isTarget;
      pane.classList.toggle('is-active', isTarget);
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  landing.querySelector('.switch-to-login')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('login');
  });

  // 2. Navigation bar actions
  landing.querySelector('.btn-landing-signin-nav')?.addEventListener('click', () => {
    if (isGuest) {
      switchTab('login');
      document.querySelector('#hero-auth-hub')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.location.hash = '#/profile';
    }
  });

  // 3. Guest Entry Handler (One-Click Launch)
  const enterGuestMode = () => {
    sessionStorage.setItem('frontpage_guest_active', 'true');
    window.location.hash = '#/feed';
    showToast('Welcome to FrontPage! 19 curated tech feeds loaded in Guest Mode.', 'info');
  };

  landing.querySelector('.btn-landing-guest-nav')?.addEventListener('click', enterGuestMode);
  landing.querySelector('.btn-launch-guest')?.addEventListener('click', enterGuestMode);
  landing.querySelector('.btn-mockup-cta')?.addEventListener('click', enterGuestMode);
  landing.querySelector('.btn-sources-explore')?.addEventListener('click', enterGuestMode);
  landing.querySelector('.btn-final-guest')?.addEventListener('click', enterGuestMode);

  // Final signup button -> scroll to register tab
  landing.querySelector('.btn-final-signup')?.addEventListener('click', () => {
    switchTab('register');
    document.querySelector('#hero-auth-hub')?.scrollIntoView({ behavior: 'smooth' });
  });

  // 4. Hero Register Form Submission
  const regForm = landing.querySelector('#hero-register-form');
  const regError = landing.querySelector('#hero-reg-error');
  const regSubmit = landing.querySelector('#hero-reg-submit');

  regForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = landing.querySelector('#hero-reg-name')?.value.trim();
    const email = landing.querySelector('#hero-reg-email')?.value.trim();
    const password = landing.querySelector('#hero-reg-password')?.value;

    if (!name || !email || !password) return;

    regSubmit.disabled = true;
    regSubmit.textContent = 'Creating account...';
    if (regError) regError.hidden = true;

    try {
      await registerUser({ name, email, password });
      sessionStorage.setItem('frontpage_guest_active', 'true');
      showToast(`Welcome ${name}! Your account is now synced.`, 'success');
      window.location.hash = '#/feed';
    } catch (err) {
      if (regError) {
        regError.textContent = err.message || 'Could not create account';
        regError.hidden = false;
      }
      showToast(err.message, 'error');
    } finally {
      regSubmit.disabled = false;
      regSubmit.textContent = 'Create Free Account & Sync →';
    }
  });

  // 5. Hero Login Form Submission
  const loginForm = landing.querySelector('#hero-login-form');
  const loginError = landing.querySelector('#hero-login-error');
  const loginSubmit = landing.querySelector('#hero-login-submit');

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = landing.querySelector('#hero-login-email')?.value.trim();
    const password = landing.querySelector('#hero-login-password')?.value;

    if (!email || !password) return;

    loginSubmit.disabled = true;
    loginSubmit.textContent = 'Signing in...';
    if (loginError) loginError.hidden = true;

    try {
      const userRes = await loginUser({ email, password });
      sessionStorage.setItem('frontpage_guest_active', 'true');
      showToast(`Welcome back, ${userRes.name}!`, 'success');
      window.location.hash = '#/feed';
    } catch (err) {
      if (loginError) {
        loginError.textContent = err.message || 'Invalid credentials';
        loginError.hidden = false;
      }
      showToast(err.message, 'error');
    } finally {
      loginSubmit.disabled = false;
      loginSubmit.textContent = 'Sign In to Your Account →';
    }
  });

  container.replaceChildren(landing);
}
