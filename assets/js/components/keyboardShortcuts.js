import { toggleArticleRead, toggleArticleSaved } from '../state.js';
import { loadPreferences } from '../services/preferences.js';
import { showToast } from './toast.js';

function isTextEntryTarget(target) {
  return target instanceof HTMLElement
    && (target.matches('input, textarea, select, [contenteditable="true"]') || target.isContentEditable);
}

function getFeedButtons() {
  return [...document.querySelectorAll('.feed-item-button')];
}

function focusRelativeArticle(direction) {
  const buttons = getFeedButtons();

  if (!buttons.length) return;

  const currentIndex = buttons.indexOf(document.activeElement);
  const nextIndex = currentIndex === -1
    ? (direction > 0 ? 0 : buttons.length - 1)
    : (currentIndex + direction + buttons.length) % buttons.length;

  buttons[nextIndex].focus();
}

function updateFocusedArticle(action) {
  const article = document.activeElement?.closest?.('.feed-item');
  const articleId = article?.dataset.articleId;

  if (!articleId) return;

  action(articleId);
  window.dispatchEvent(new Event('frontpage:feed-change'));
}

export function initialiseKeyboardShortcuts() {
  window.addEventListener('keydown', (event) => {
    if (!loadPreferences().vimShortcuts || event.defaultPrevented || isTextEntryTarget(event.target)) {
      return;
    }

    if (event.key === '/') {
      event.preventDefault();
      document.querySelector('.search-bar')?.focus();
      return;
    }

    if (event.key === 'j') {
      event.preventDefault();
      focusRelativeArticle(1);
      return;
    }

    if (event.key === 'k') {
      event.preventDefault();
      focusRelativeArticle(-1);
      return;
    }

    if (event.key === 'o' || event.key === 'Enter') {
      const activeArticle = document.activeElement?.matches?.('.feed-item-button');

      if (activeArticle) {
        event.preventDefault();
        document.activeElement.click();
      }
      return;
    }

    if (event.key === 'm') {
      event.preventDefault();
      updateFocusedArticle(toggleArticleRead);
      return;
    }

    if (event.key === 's') {
      event.preventDefault();
      updateFocusedArticle(toggleArticleSaved);
      return;
    }

    if (event.key === '?') {
      showToast('Raccourcis : j/k naviguer · o ouvrir · m lu/non lu · s sauvegarder · / rechercher.', 'info', 6000);
    }
  });
}
