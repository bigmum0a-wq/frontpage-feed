import {
  getCategoryById,
  getFeedById,
  getUnreadCount,
  markAllArticlesAsRead,
  setActiveCategory,
  state,
} from '../state.js';
import { openAudioPlayer } from '../components/audioPlayer.js';
import { openArticleReader } from '../components/reader.js';
import { api } from '../services/apiService.js';
import { showToast } from '../components/toast.js';
import { exportDigestEpub, openMagazinePrintView } from '../services/exportService.js';

let readingMode = 'brief';
let cachedAiDigest = null;

function element(tagName, className, text) {
  const node = document.createElement(tagName);

  if (className) node.className = className;
  if (text) node.textContent = text;

  return node;
}

function getArticles() {
  return [...state.articles].sort(
    (first, second) => new Date(second.publishedAt) - new Date(first.publishedAt),
  );
}

function relativeDate(dateString) {
  const hours = Math.max(1, Math.floor((Date.now() - new Date(dateString)) / 3600000));

  return hours < 24 ? `${hours}h ago` : 'Yesterday';
}

function summaryCard(label, value, description) {
  const card = element('article', 'digest-summary-card');

  card.append(element('span', '', label), element('strong', '', value), element('p', '', description));

  return card;
}

function storyCard(article, featured) {
  const feed = getFeedById(article.feedId);
  const category = feed && getCategoryById(feed.categoryId);
  const story = element('article', `digest-story${featured ? ' digest-story-featured' : ''}`);
  const content = element('div', 'digest-story-content');
  const footer = element('div', 'digest-story-footer');
  const tag = element('span', 'feed-item-category', category?.name ?? 'Uncategorized');
  const readButton = element('button', '', 'Read story');
  const listenButton = element('button', '', 'Listen');

  tag.style.setProperty('--category-color', category?.color ?? 'var(--color-accent)');
  tag.style.setProperty('--category-background', category?.background ?? 'var(--color-accent-subtle)');
  readButton.type = 'button';
  listenButton.type = 'button';
  readButton.addEventListener('click', () => openArticleReader(article));
  listenButton.addEventListener('click', () => {
    openAudioPlayer({ title: article.title, text: `${article.title}. ${article.excerpt}` });
  });
  footer.append(tag, element('span', 'digest-story-actions'));
  footer.lastElementChild.append(listenButton, readButton);
  content.append(
    element('p', 'digest-story-meta', `${feed?.name ?? 'Unknown source'} · ${relativeDate(article.publishedAt)}`),
    element('h3', '', article.title),
    element('p', '', article.excerpt),
  );

  if (featured) {
    const takeaways = element('div', 'digest-takeaways');

    takeaways.append(
      element('strong', '', 'Why it matters'),
      element('span', '', `A key update from ${feed?.name ?? 'this source'} in your reading collection.`),
    );
    content.append(takeaways);
  }

  content.append(footer);
  story.append(content);

  return story;
}

function topicCard(category, articles) {
  const card = element('article', 'digest-topic-card');
  const heading = element('div');
  const count = getUnreadCount(articles);
  const link = element('a', '', 'View articles');

  link.href = '#feed';
  link.addEventListener('click', () => setActiveCategory(category.id));
  heading.append(element('h3', '', category.name), element('span', '', `${count} new`));
  card.append(
    heading,
    element('p', '', articles.length
      ? `${articles.length} article${articles.length === 1 ? '' : 's'} available in this category.`
      : 'No recent articles in this category yet.'),
    link,
  );

  return card;
}

function trendItem(category, articles) {
  const trend = element('div', 'trend-item');
  const content = element('div');

  content.append(
    element('strong', '', category.name),
    element('span', '', `${articles.length} article${articles.length === 1 ? '' : 's'} in your latest updates`),
  );
  trend.append(content, element('b', '', `+${articles.length}`));

  return trend;
}

function renderDigestContent() {
  const articles = getArticles();
  const storyCount = readingMode === 'brief' ? 1 : readingMode === 'standard' ? 3 : articles.length;
  const unreadCount = getUnreadCount(articles);
  const groups = state.categories.map((category) => ({
    category,
    articles: articles.filter((article) => getFeedById(article.feedId)?.categoryId === category.id),
  }));
  const summary = document.querySelector('.digest-summary');
  const brief = document.querySelector('.digest-brief-copy');
  const period = document.querySelector('#digest-period');
  const stories = document.querySelector('#story-clusters');
  const topics = document.querySelector('#digest-topics');
  const trends = document.querySelector('#trending-content');

  summary?.replaceChildren(
    summaryCard('Unread', String(unreadCount), 'articles waiting in your feeds'),
    summaryCard('Selected', String(Math.min(3, unreadCount)), 'stories selected for today'),
    summaryCard('Reading time', `${Math.max(1, unreadCount * 3)} min`, "to cover today's highlights"),
  );
  if (brief) {
    brief.textContent = unreadCount
      ? `You have ${unreadCount} unread articles. The digest surfaces the newest stories so you can catch up quickly.`
      : 'You are all caught up. New stories will appear here when your feeds update.';
  }
  if (period) period.textContent = `Based on ${articles.length} recent articles across ${state.categories.length} categories.`;
  stories?.replaceChildren(...articles.slice(0, storyCount).map((article, index) => storyCard(article, index === 0)));
  topics?.replaceChildren(...groups.map(({ category, articles: categoryArticles }) => topicCard(category, categoryArticles)));
  trends?.replaceChildren(
    ...groups
      .filter(({ articles: categoryArticles }) => categoryArticles.length)
      .sort((first, second) => second.articles.length - first.articles.length)
      .slice(0, 3)
      .map(({ category, articles: categoryArticles }) => trendItem(category, categoryArticles)),
  );
}

function updateCatchUpState() {
  const unreadCount = getUnreadCount(state.articles);
  const totalCount = state.articles.length;
  const reviewedCount = totalCount - unreadCount;
  const progressText = document.querySelector('#catch-up-progress-text');
  const progressBar = document.querySelector('#catch-up-progress-bar');
  const description = document.querySelector('#catch-up-content p');

  if (progressText) progressText.textContent = `${reviewedCount} of ${totalCount} articles reviewed`;
  if (progressBar) progressBar.style.width = `${totalCount ? (reviewedCount / totalCount) * 100 : 0}%`;
  if (description) description.textContent = unreadCount
    ? `${unreadCount} article${unreadCount === 1 ? '' : 's'} remain available in Feed for later.`
    : 'You are all caught up for now.';
}

function setPressedButton(buttons, activeButton) {
  buttons.forEach((button) => {
    const active = button === activeButton;

    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function renderAiDigestCard() {
  const contentEl = document.querySelector('#ai-briefing-content');
  const themesEl = document.querySelector('#ai-briefing-themes');
  const generateBtn = document.querySelector('#btn-generate-ai-digest');

  if (!contentEl) return;

  if (cachedAiDigest) {
    const paragraphs = cachedAiDigest.briefing
      .split('\n\n')
      .filter(Boolean)
      .map((p) => `<p>${p}</p>`)
      .join('');
    contentEl.innerHTML = paragraphs;

    if (themesEl && Array.isArray(cachedAiDigest.topThemes) && cachedAiDigest.topThemes.length > 0) {
      themesEl.innerHTML = cachedAiDigest.topThemes
        .map((tag) => `<span class="reader-tag-pill">${tag.startsWith('#') ? tag : `#${tag}`}</span>`)
        .join(' ');
    }
  }

  if (generateBtn && !generateBtn.dataset.bound) {
    generateBtn.dataset.bound = 'true';
    generateBtn.addEventListener('click', async () => {
      generateBtn.disabled = true;
      generateBtn.classList.add('spinning');
      contentEl.innerHTML = '<p class="ai-briefing-loading">✨ AI is summarizing and composing your briefing...</p>';

      try {
        const res = await api.generateAiDigest();
        if (res?.data) {
          cachedAiDigest = res.data;
          renderAiDigestCard();
          showToast('AI Briefing updated!', 'success');
        }
      } catch (err) {
        contentEl.innerHTML = '<p class="ai-briefing-placeholder">Unable to generate the briefing right now. Please try again.</p>';
        showToast('Error generating briefing', 'error');
      } finally {
        generateBtn.disabled = false;
        generateBtn.classList.remove('spinning');
      }
    });
  }
}

export function initialiseDigestView(onDigestUpdate) {
  const periodButtons = document.querySelectorAll('[data-digest-period]');
  const readingButtons = document.querySelectorAll('[data-reading-mode]');
  const markReadButton = document.querySelector('#mark-digest-read');
  const audioBriefingButton = document.querySelector('#audio-briefing');

  renderDigestContent();
  renderAiDigestCard();
  updateCatchUpState();
  periodButtons.forEach((button) => button.addEventListener('click', () => setPressedButton(periodButtons, button)));
  readingButtons.forEach((button) => button.addEventListener('click', () => {
    readingMode = button.dataset.readingMode ?? 'brief';
    setPressedButton(readingButtons, button);
    renderDigestContent();
  }));
  audioBriefingButton?.addEventListener('click', () => {
    const articles = getArticles();
    const text = cachedAiDigest 
      ? `AI Briefing: ${cachedAiDigest.briefing}`
      : articles.map((article) => `${article.title}. ${article.excerpt}`).join(' ');

    openAudioPlayer({ title: 'Your Audio Briefing', text });
  });

  // Feature 7 : Export Magazine PDF & EPUB
  const exportPdfBtn = document.querySelector('#export-pdf-magazine');
  const exportEpubBtn = document.querySelector('#export-epub-digest');

  exportPdfBtn?.addEventListener('click', () => {
    const articles = getArticles();
    openMagazinePrintView(articles, 'FrontPage Weekly Digest');
  });

  exportEpubBtn?.addEventListener('click', () => {
    const articles = getArticles();
    exportDigestEpub(articles, 'FrontPage Weekly Digest');
  });

  markReadButton?.addEventListener('click', () => {
    markAllArticlesAsRead();
    renderDigestContent();
    updateCatchUpState();
    onDigestUpdate?.();
  });
}

