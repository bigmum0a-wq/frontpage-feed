import test from 'node:test';
import assert from 'node:assert/strict';
import { getDatabase } from '../../config/database.js';
import { CategoryModel } from '../models/categoryModel.js';
import { FeedModel } from '../models/feedModel.js';
import { ArticleModel } from '../models/articleModel.js';

test('Database Models: CategoryModel, FeedModel, ArticleModel CRUD', async () => {
  const db = await getDatabase();
  assert.ok(db);

  const categories = await CategoryModel.getAll('guest-user-001');
  assert.ok(Array.isArray(categories));
  assert.equal(categories.length >= 1, true);

  const feeds = await FeedModel.getAll('guest-user-001');
  assert.ok(Array.isArray(feeds));
  assert.equal(feeds.length >= 1, true);

  const articles = await ArticleModel.getArticles('guest-user-001', { limit: 10 });
  assert.ok(Array.isArray(articles));
  assert.equal(articles.length >= 1, true);
});
