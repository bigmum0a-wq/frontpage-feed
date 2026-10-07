/**
 * search.js — Global Search Component with Semantic Suggestions Dropdown
 */

const QUICK_SUGGESTIONS = [
  { icon: '✨', text: 'Unread AI articles', query: 'unread AI articles' },
  { icon: '⚡', text: 'Performance optimization', query: 'performance cache' },
  { icon: '🎨', text: 'Design & accessibility guides', query: 'design accessibility' },
  { icon: '★', text: 'Recently saved articles', query: 'starred this week' },
  { icon: '📅', text: 'Everything published this week', query: 'this week' },
];

export function initialiseGlobalSearch(onSearch) {
  const container = document.querySelector('.global-search');
  const input = document.querySelector('.search-bar');

  if (!input || !container) {
    return {
      focus: () => {},
      clear: () => {},
    };
  }

  // Update placeholder with semantic hint
  input.placeholder = 'Semantic search (e.g. "unread AI", "performance")...';

  // ── Create suggestions dropdown ───────────────────────────────────────────
  let dropdown = container.querySelector('.search-suggestions-dropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.className = 'search-suggestions-dropdown';
    dropdown.hidden = true;
    dropdown.setAttribute('role', 'listbox');
    dropdown.setAttribute('aria-label', 'Search suggestions');

    dropdown.innerHTML = `
      <div class="search-suggestions-header">
        <span>💡 Natural language search examples</span>
      </div>
      <ul class="search-suggestions-list" role="list">
        ${QUICK_SUGGESTIONS.map((item) => `
          <li class="search-suggestion-item" data-query="${escapeAttr(item.query)}" role="option">
            <span class="suggestion-icon">${item.icon}</span>
            <span class="suggestion-text">${escapeHtml(item.text)}</span>
            <span class="suggestion-query">“${escapeHtml(item.query)}”</span>
          </li>
        `).join('')}
      </ul>
    `;

    container.appendChild(dropdown);
  }

  // ── Event Handlers ────────────────────────────────────────────────────────
  function showSuggestions() {
    if (input.value.trim() === '') {
      dropdown.hidden = false;
    } else {
      dropdown.hidden = true;
    }
  }

  function hideSuggestions() {
    dropdown.hidden = true;
  }

  input.addEventListener('focus', showSuggestions);

  input.addEventListener('input', () => {
    onSearch(input.value);
    showSuggestions();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideSuggestions();
      input.blur();
    }
  });

  // Suggestion click
  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.search-suggestion-item');
    if (item?.dataset.query) {
      input.value = item.dataset.query;
      hideSuggestions();
      onSearch(input.value);
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      hideSuggestions();
    }
  });

  return {
    focus() {
      input.focus();
      showSuggestions();
    },
    clear() {
      input.value = '';
      hideSuggestions();
      onSearch('');
    },
  };
}

function escapeHtml(str) {
  if (!str) return '';
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
