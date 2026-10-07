/**
 * rulesService.js — Smart Filters & Automatic Rules Engine
 *
 * Allows the user to define rules that are automatically applied to new/existing
 * articles. Each rule has conditions and actions.
 *
 * Rule Schema:
 * {
 *   id: string,
 *   name: string,
 *   enabled: boolean,
 *   conditions: Array<{ field, operator, value }>,
 *   conditionLogic: 'all' | 'any',  // AND vs OR
 *   actions: Array<{ type, value }>,
 *   createdAt: ISO string,
 * }
 *
 * Supported condition fields:  title, excerpt, author, feedId, categoryId, aiTags
 * Supported operators:         contains, not_contains, starts_with, ends_with, equals, matches_regex
 * Supported action types:      mark_read, mark_saved, add_tag, notify, skip (hide)
 */

const RULES_STORAGE_KEY = 'frontpage-rules';

// ─── Storage ─────────────────────────────────────────────────────────────────

export function loadRules() {
  try {
    const raw = localStorage.getItem(RULES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRules(rules) {
  try {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(rules));
    return true;
  } catch {
    return false;
  }
}

// ─── CRUD ────────────────────────────────────────────────────────────────────

export function createRule({ name, conditions, conditionLogic = 'all', actions }) {
  const rules = loadRules();
  const newRule = {
    id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name || 'Unnamed rule',
    enabled: true,
    conditions: conditions || [],
    conditionLogic,
    actions: actions || [],
    matchCount: 0,
    createdAt: new Date().toISOString(),
  };
  rules.push(newRule);
  saveRules(rules);
  return newRule;
}

export function updateRule(ruleId, updates) {
  const rules = loadRules();
  const idx = rules.findIndex((r) => r.id === ruleId);
  if (idx === -1) return null;
  rules[idx] = { ...rules[idx], ...updates };
  saveRules(rules);
  return rules[idx];
}

export function deleteRule(ruleId) {
  const rules = loadRules().filter((r) => r.id !== ruleId);
  saveRules(rules);
}

export function toggleRule(ruleId) {
  const rules = loadRules();
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) return null;
  rule.enabled = !rule.enabled;
  saveRules(rules);
  return rule.enabled;
}

// ─── Engine ──────────────────────────────────────────────────────────────────

/**
 * Evaluates a single condition against an article.
 */
function evaluateCondition(condition, article) {
  const { field, operator, value } = condition;
  const needle = (value || '').toLowerCase().trim();

  let haystack = '';
  if (field === 'title')      haystack = (article.title || '').toLowerCase();
  else if (field === 'excerpt')  haystack = (article.excerpt || '').toLowerCase();
  else if (field === 'author')   haystack = (article.author || '').toLowerCase();
  else if (field === 'feedId')   haystack = (article.feedId || '').toLowerCase();
  else if (field === 'feedName') haystack = (article.feedName || '').toLowerCase();
  else if (field === 'categoryId') haystack = (article.categoryId || '').toLowerCase();
  else if (field === 'aiTags') {
    const tags = Array.isArray(article.aiTags) ? article.aiTags.join(' ') : (article.aiTags || '');
    haystack = tags.toLowerCase();
  }

  switch (operator) {
    case 'contains':      return haystack.includes(needle);
    case 'not_contains':  return !haystack.includes(needle);
    case 'starts_with':   return haystack.startsWith(needle);
    case 'ends_with':     return haystack.endsWith(needle);
    case 'equals':        return haystack === needle;
    case 'matches_regex': {
      try {
        return new RegExp(value, 'i').test(haystack);
      } catch {
        return false;
      }
    }
    default: return false;
  }
}

/**
 * Checks if a rule matches an article.
 */
export function ruleMatchesArticle(rule, article) {
  if (!rule.enabled || !rule.conditions?.length) return false;

  const results = rule.conditions.map((c) => evaluateCondition(c, article));

  return rule.conditionLogic === 'any'
    ? results.some(Boolean)
    : results.every(Boolean);
}

/**
 * Applies a single rule's actions to an article object (mutates in place).
 * Returns an array of triggered action types.
 */
export function applyRuleActions(rule, article) {
  const triggered = [];

  for (const action of (rule.actions || [])) {
    switch (action.type) {
      case 'mark_read':
        if (!article.isRead) {
          article.isRead = true;
          triggered.push('mark_read');
        }
        break;
      case 'mark_saved':
        if (!article.isSaved) {
          article.isSaved = true;
          triggered.push('mark_saved');
        }
        break;
      case 'skip':
        article._hidden = true;
        triggered.push('skip');
        break;
      case 'notify':
        triggered.push('notify');
        break;
      case 'add_tag': {
        const tag = (action.value || '').trim();
        if (tag) {
          const tags = Array.isArray(article.aiTags) ? article.aiTags : [];
          if (!tags.includes(`#${tag}`)) {
            article.aiTags = [...tags, `#${tag}`];
            triggered.push('add_tag');
          }
        }
        break;
      }
    }
  }

  return triggered;
}

/**
 * Applies all enabled rules to a list of articles.
 * Returns { articles: mutated list, notifications: Array<{rule, article}> }
 */
export function applyAllRules(articles) {
  const rules = loadRules().filter((r) => r.enabled);
  const notifications = [];
  const updatedRules = loadRules();

  for (const article of articles) {
    for (const rule of rules) {
      if (ruleMatchesArticle(rule, article)) {
        const triggered = applyRuleActions(rule, article);

        if (triggered.length > 0) {
          // Increment match count
          const ur = updatedRules.find((r) => r.id === rule.id);
          if (ur) ur.matchCount = (ur.matchCount || 0) + 1;

          if (triggered.includes('notify')) {
            notifications.push({ rule, article });
          }
        }
      }
    }
  }

  // Persist updated match counts
  saveRules(updatedRules);

  return {
    articles: articles.filter((a) => !a._hidden),
    notifications,
  };
}

// ─── Default Rules ────────────────────────────────────────────────────────────

/**
 * Creates sensible default starter rules if none exist.
 */
export function seedDefaultRules() {
  const existing = loadRules();
  if (existing.length > 0) return;

  const defaults = [
    {
      name: '🚀 AI & ML Alerts',
      conditions: [
        { field: 'title',   operator: 'contains', value: 'AI' },
        { field: 'title',   operator: 'contains', value: 'machine learning' },
        { field: 'aiTags',  operator: 'contains', value: '#ai' },
      ],
      conditionLogic: 'any',
      actions: [{ type: 'mark_saved' }, { type: 'notify' }],
    },
    {
      name: '📬 Auto-read: newsletters',
      conditions: [
        { field: 'title', operator: 'contains', value: 'newsletter' },
        { field: 'title', operator: 'contains', value: 'weekly' },
        { field: 'title', operator: 'contains', value: 'digest' },
      ],
      conditionLogic: 'any',
      actions: [{ type: 'mark_read' }],
    },
    {
      name: '🚫 Hide job postings',
      conditions: [
        { field: 'title', operator: 'contains', value: 'hiring' },
        { field: 'title', operator: 'contains', value: 'job' },
        { field: 'title', operator: 'contains', value: 'we are looking for' },
      ],
      conditionLogic: 'any',
      actions: [{ type: 'skip' }],
    },
  ];

  defaults.forEach((d) => createRule(d));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const FIELD_LABELS = {
  title:      'Title',
  excerpt:    'Excerpt',
  author:     'Author',
  feedId:     'Feed ID',
  feedName:   'Feed Name',
  categoryId: 'Category',
  aiTags:     'AI Tags',
};

export const OPERATOR_LABELS = {
  contains:      'contains',
  not_contains:  'does not contain',
  starts_with:   'starts with',
  ends_with:     'ends with',
  equals:        'is exactly',
  matches_regex: 'matches regex',
};

export const ACTION_LABELS = {
  mark_read:  '✓ Mark as read',
  mark_saved: '★ Bookmark',
  skip:       '🚫 Hide article',
  notify:     '🔔 Toast notification',
  add_tag:    '🏷️ Add tag',
};
