import test from 'node:test';
import assert from 'node:assert/strict';

// Polyfill localStorage for Node.js test environment
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => (mockStorage.has(key) ? mockStorage.get(key) : null),
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

const {
  createRule,
  loadRules,
  updateRule,
  deleteRule,
  toggleRule,
  ruleMatchesArticle,
  applyRuleActions,
  applyAllRules,
  seedDefaultRules,
} = await import('../../assets/js/services/rulesService.js');

test('Rules Engine: CRUD operations on rules', () => {
  localStorage.clear();

  const rule = createRule({
    name: 'Auto-save React',
    conditions: [{ field: 'title', operator: 'contains', value: 'React' }],
    conditionLogic: 'all',
    actions: [{ type: 'mark_saved' }],
  });

  assert.ok(rule.id);
  assert.equal(rule.name, 'Auto-save React');
  assert.equal(rule.enabled, true);

  const rules = loadRules();
  assert.equal(rules.length, 1);
  assert.equal(rules[0].id, rule.id);

  // Toggle
  const enabledState = toggleRule(rule.id);
  assert.equal(enabledState, false);

  // Update
  updateRule(rule.id, { name: 'Updated Rule Name' });
  const updated = loadRules().find((r) => r.id === rule.id);
  assert.equal(updated.name, 'Updated Rule Name');

  // Delete
  deleteRule(rule.id);
  assert.equal(loadRules().length, 0);
});

test('Rules Engine: ruleMatchesArticle matches correctly across fields and operators', () => {
  const article = {
    title: 'Modern React & TypeScript Architecture',
    excerpt: 'Deep dive into microfrontends and state machines.',
    author: 'Dan Abramov',
    feedId: 'frontend-daily',
    feedName: 'Frontend Daily',
    categoryId: 'frontend',
    aiTags: ['#react', '#typescript'],
  };

  // 1. contains
  const rule1 = {
    enabled: true,
    conditionLogic: 'all',
    conditions: [{ field: 'title', operator: 'contains', value: 'react' }],
  };
  assert.equal(ruleMatchesArticle(rule1, article), true);

  // 2. not_contains
  const rule2 = {
    enabled: true,
    conditionLogic: 'all',
    conditions: [{ field: 'title', operator: 'not_contains', value: 'Vue' }],
  };
  assert.equal(ruleMatchesArticle(rule2, article), true);

  // 3. starts_with
  const rule3 = {
    enabled: true,
    conditionLogic: 'all',
    conditions: [{ field: 'title', operator: 'starts_with', value: 'Modern' }],
  };
  assert.equal(ruleMatchesArticle(rule3, article), true);

  // 4. regex
  const rule4 = {
    enabled: true,
    conditionLogic: 'all',
    conditions: [{ field: 'excerpt', operator: 'matches_regex', value: 'micro[a-z]+' }],
  };
  assert.equal(ruleMatchesArticle(rule4, article), true);

  // 5. aiTags match
  const rule5 = {
    enabled: true,
    conditionLogic: 'all',
    conditions: [{ field: 'aiTags', operator: 'contains', value: 'typescript' }],
  };
  assert.equal(ruleMatchesArticle(rule5, article), true);

  // 6. logic OR (any)
  const ruleOr = {
    enabled: true,
    conditionLogic: 'any',
    conditions: [
      { field: 'title', operator: 'contains', value: 'Angular' }, // false
      { field: 'author', operator: 'contains', value: 'Dan' },    // true
    ],
  };
  assert.equal(ruleMatchesArticle(ruleOr, article), true);
});

test('Rules Engine: applyRuleActions and applyAllRules executes actions and filters', () => {
  localStorage.clear();

  createRule({
    name: 'Mark AI articles as saved and notify',
    conditions: [{ field: 'title', operator: 'contains', value: 'AI' }],
    conditionLogic: 'all',
    actions: [{ type: 'mark_saved' }, { type: 'notify' }, { type: 'add_tag', value: 'priority' }],
  });

  createRule({
    name: 'Skip sponsor posts',
    conditions: [{ field: 'title', operator: 'contains', value: 'SPONSOR' }],
    conditionLogic: 'all',
    actions: [{ type: 'skip' }],
  });

  const sampleArticles = [
    { id: '1', title: 'Generative AI in Production', isSaved: false, isRead: false, aiTags: [] },
    { id: '2', title: 'SPONSOR: Cloud Hosting Deals', isSaved: false, isRead: false },
    { id: '3', title: 'Vanilla JS State Management', isSaved: false, isRead: false },
  ];

  const result = applyAllRules(sampleArticles);

  // Article 2 should be filtered out because of 'skip'
  assert.equal(result.articles.length, 2);
  assert.equal(result.articles.some((a) => a.id === '2'), false);

  // Article 1 should be saved and have new tag
  const art1 = result.articles.find((a) => a.id === '1');
  assert.equal(art1.isSaved, true);
  assert.ok(art1.aiTags.includes('#priority'));

  // Notification triggered for article 1
  assert.equal(result.notifications.length, 1);
  assert.equal(result.notifications[0].article.id, '1');
});
