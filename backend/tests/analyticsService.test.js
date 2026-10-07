import test from 'node:test';
import assert from 'node:assert/strict';
import { AnalyticsModel, calculateStreaks } from '../models/analyticsModel.js';
import { ArticleModel } from '../models/articleModel.js';

test('Analytics: calculateStreaks handles today, yesterday, and gap streaks', () => {
  const today = new Date();
  const d0 = today.toISOString().split('T')[0];
  
  const y1 = new Date();
  y1.setDate(y1.getDate() - 1);
  const d1 = y1.toISOString().split('T')[0];

  const y2 = new Date();
  y2.setDate(y2.getDate() - 2);
  const d2 = y2.toISOString().split('T')[0];

  const y5 = new Date();
  y5.setDate(y5.getDate() - 5);
  const d5 = y5.toISOString().split('T')[0];

  const y6 = new Date();
  y6.setDate(y6.getDate() - 6);
  const d6 = y6.toISOString().split('T')[0];

  const y7 = new Date();
  y7.setDate(y7.getDate() - 7);
  const d7 = y7.toISOString().split('T')[0];

  const y8 = new Date();
  y8.setDate(y8.getDate() - 8);
  const d8 = y8.toISOString().split('T')[0];

  // 1. User read today, yesterday, and 2 days ago (3-day current streak)
  // Historical streak was 4 days (d5, d6, d7, d8)
  const dates = [d0, d1, d2, d5, d6, d7, d8];
  const res = calculateStreaks(dates);

  assert.equal(res.hasReadToday, true);
  assert.equal(res.currentStreak, 3);
  assert.equal(res.longestStreak, 4);

  // 2. User has not read today, but read yesterday and 2 days ago (streak preserved at 2)
  const resYesterday = calculateStreaks([d1, d2]);
  assert.equal(resYesterday.hasReadToday, false);
  assert.equal(resYesterday.currentStreak, 2);
  assert.equal(resYesterday.longestStreak, 2);

  // 3. User last read 5 days ago (broken streak = 0)
  const resBroken = calculateStreaks([d5, d6]);
  assert.equal(resBroken.hasReadToday, false);
  assert.equal(resBroken.currentStreak, 0);
  assert.equal(resBroken.longestStreak, 2);

  // 4. Empty list
  const resEmpty = calculateStreaks([]);
  assert.equal(resEmpty.currentStreak, 0);
  assert.equal(resEmpty.longestStreak, 0);
});

test('Analytics Model: getOverview returns reading stats and time savings', async () => {
  // Ensure at least 1 article is marked as read for guest user
  const articles = await ArticleModel.getArticles('guest-user-001', { limit: 1 });
  if (articles.length > 0) {
    await ArticleModel.markAsRead('guest-user-001', articles[0].id, true);
  }

  const overview = await AnalyticsModel.getOverview('guest-user-001');

  assert.ok(typeof overview.totalRead === 'number');
  assert.ok(typeof overview.totalSaved === 'number');
  assert.ok(typeof overview.currentStreak === 'number');
  assert.ok(typeof overview.longestStreak === 'number');
  assert.ok(typeof overview.totalMinutesRead === 'number');
  assert.ok(typeof overview.minutesSavedWithAi === 'number');
});

test('Analytics Model: getActivityHeatmap & getBreakdown return structured datasets', async () => {
  const heatmap = await AnalyticsModel.getActivityHeatmap('guest-user-001');
  assert.ok(Array.isArray(heatmap.history));
  assert.ok(typeof heatmap.activityMap === 'object');

  const breakdown = await AnalyticsModel.getBreakdown('guest-user-001');
  assert.ok(Array.isArray(breakdown.categories));
  assert.ok(Array.isArray(breakdown.topFeeds));
  assert.ok(typeof breakdown.timeSlots === 'object');
  assert.ok(typeof breakdown.timeSlots.morning === 'number');
  assert.ok(Array.isArray(breakdown.weekdays));
  assert.equal(breakdown.weekdays.length, 7);
});
