// Analytics Model & Aggregation Engine
import { getDatabase } from '../../config/database.js';

export const AnalyticsModel = {
  /**
   * Retrieves overall reading KPIs, streaks, and time metrics
   */
  async getOverview(userId = 'guest-user-001') {
    const db = await getDatabase();

    // 1. Basic Counts
    const counts = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM user_articles WHERE user_id = ? AND is_read = 1) AS totalRead,
        (SELECT COUNT(*) FROM user_articles WHERE user_id = ? AND is_saved = 1) AS totalSaved,
        (SELECT COUNT(*) FROM user_feeds WHERE user_id = ?) AS totalFeeds,
        (SELECT COUNT(*) FROM user_articles WHERE user_id = ? AND is_read = 1 AND DATE(read_at) = DATE('now', 'localtime')) AS readToday,
        (SELECT COUNT(*) FROM user_articles WHERE user_id = ? AND is_read = 1 AND read_at >= DATE('now', '-7 days')) AS readThisWeek
    `).get(userId, userId, userId, userId, userId);

    // 2. Reading Time & AI Time Saved
    const timeStats = db.prepare(`
      SELECT 
        SUM(COALESCE(a.ai_reading_time, 2)) AS totalMinutesRead,
        SUM(CASE WHEN a.ai_summary IS NOT NULL THEN MAX(1, COALESCE(a.ai_reading_time, 2) - 1) ELSE 0 END) AS minutesSavedWithAi,
        COUNT(CASE WHEN a.ai_summary IS NOT NULL THEN 1 ELSE NULL END) AS aiSummariesRead
      FROM user_articles ua
      JOIN articles a ON ua.article_id = a.id
      WHERE ua.user_id = ? AND ua.is_read = 1
    `).get(userId);

    // 3. Streaks Calculation
    const readDatesRows = db.prepare(`
      SELECT DISTINCT DATE(read_at) AS readDate
      FROM user_articles
      WHERE user_id = ? AND is_read = 1 AND read_at IS NOT NULL
      ORDER BY readDate DESC
    `).all(userId);

    const readDates = readDatesRows.map((r) => r.readDate);
    const { currentStreak, longestStreak, hasReadToday } = calculateStreaks(readDates);

    return {
      totalRead: counts.totalRead || 0,
      totalSaved: counts.totalSaved || 0,
      totalFeeds: counts.totalFeeds || 0,
      readToday: counts.readToday || 0,
      readThisWeek: counts.readThisWeek || 0,
      hasReadToday,
      currentStreak,
      longestStreak,
      totalMinutesRead: Math.round(timeStats.totalMinutesRead || 0),
      minutesSavedWithAi: Math.round(timeStats.minutesSavedWithAi || 0),
      aiSummariesRead: timeStats.aiSummariesRead || 0,
    };
  },

  /**
   * Retrieves daily reading count for the last 365 days for the activity heatmap
   */
  async getActivityHeatmap(userId = 'guest-user-001') {
    const db = await getDatabase();
    const rows = db.prepare(`
      SELECT 
        DATE(read_at) AS date,
        COUNT(*) AS count
      FROM user_articles
      WHERE user_id = ? AND is_read = 1 AND read_at IS NOT NULL AND read_at >= DATE('now', '-365 days')
      GROUP BY DATE(read_at)
      ORDER BY date ASC
    `).all(userId);

    const activityMap = {};
    for (const r of rows) {
      if (r.date) {
        activityMap[r.date] = r.count;
      }
    }

    return {
      history: rows,
      activityMap,
    };
  },

  /**
   * Retrieves category distribution, top feeds, hourly patterns and weekly distribution
   */
  async getBreakdown(userId = 'guest-user-001') {
    const db = await getDatabase();

    // Category breakdown
    const categoryRows = db.prepare(`
      SELECT 
        COALESCE(c.id, 'uncategorized') AS categoryId,
        COALESCE(c.name, 'General') AS categoryName,
        COALESCE(c.color, '#64748b') AS categoryColor,
        COUNT(ua.article_id) AS count
      FROM user_articles ua
      JOIN articles a ON ua.article_id = a.id
      JOIN user_feeds uf ON a.feed_id = uf.feed_id AND uf.user_id = ?
      LEFT JOIN categories c ON uf.category_id = c.id
      WHERE ua.user_id = ? AND ua.is_read = 1
      GROUP BY categoryId
      ORDER BY count DESC
    `).all(userId, userId);

    const totalReadCategory = categoryRows.reduce((sum, item) => sum + item.count, 0) || 1;
    const categories = categoryRows.map((cat) => ({
      ...cat,
      percentage: Math.round((cat.count / totalReadCategory) * 100),
    }));

    // Top 5 Feeds
    const topFeeds = db.prepare(`
      SELECT 
        f.id,
        f.title,
        f.initials,
        f.color,
        COUNT(ua.article_id) AS readCount
      FROM user_articles ua
      JOIN articles a ON ua.article_id = a.id
      JOIN feeds f ON a.feed_id = f.id
      WHERE ua.user_id = ? AND ua.is_read = 1
      GROUP BY f.id
      ORDER BY readCount DESC
      LIMIT 5
    `).all(userId);

    // Hourly Distribution (Morning, Afternoon, Evening, Night)
    const hourlyRows = db.prepare(`
      SELECT 
        CAST(strftime('%H', read_at) AS INTEGER) AS hour,
        COUNT(*) AS count
      FROM user_articles
      WHERE user_id = ? AND is_read = 1 AND read_at IS NOT NULL
      GROUP BY hour
    `).all(userId);

    const timeSlots = {
      morning: 0,   // 06h - 11h
      afternoon: 0, // 12h - 17h
      evening: 0,   // 18h - 22h
      night: 0,     // 23h - 05h
    };

    for (const h of hourlyRows) {
      const hour = h.hour;
      if (hour >= 6 && hour < 12) timeSlots.morning += h.count;
      else if (hour >= 12 && hour < 18) timeSlots.afternoon += h.count;
      else if (hour >= 18 && hour < 23) timeSlots.evening += h.count;
      else timeSlots.night += h.count;
    }

    // Day of Week Distribution (0 = Sunday, 1 = Monday, ...)
    const weekdayRows = db.prepare(`
      SELECT 
        CAST(strftime('%w', read_at) AS INTEGER) AS dayOfWeek,
        COUNT(*) AS count
      FROM user_articles
      WHERE user_id = ? AND is_read = 1 AND read_at IS NOT NULL
      GROUP BY dayOfWeek
      ORDER BY dayOfWeek ASC
    `).all(userId);

    const daysMap = { 0: 'Dim', 1: 'Lun', 2: 'Mar', 3: 'Mer', 4: 'Jeu', 5: 'Ven', 6: 'Sam' };
    const weekdays = [1, 2, 3, 4, 5, 6, 0].map((d) => {
      const found = weekdayRows.find((r) => r.dayOfWeek === d);
      return {
        day: daysMap[d],
        dayIndex: d,
        count: found ? found.count : 0,
      };
    });

    return {
      categories,
      topFeeds,
      timeSlots,
      weekdays,
    };
  },
};

/**
 * Calculates current streak and longest streak from a list of sorted YYYY-MM-DD date strings (DESC)
 */
export function calculateStreaks(sortedDateStrings = []) {
  if (!sortedDateStrings || sortedDateStrings.length === 0) {
    return { currentStreak: 0, longestStreak: 0, hasReadToday: false };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const dateSet = new Set(sortedDateStrings);
  const hasReadToday = dateSet.has(todayStr);

  // 1. Current Streak calculation
  let currentStreak = 0;
  let checkDate = hasReadToday ? new Date() : yesterdayDate;

  while (true) {
    const dStr = checkDate.toISOString().split('T')[0];
    if (dateSet.has(dStr)) {
      currentStreak += 1;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // If didn't read today and didn't read yesterday, current streak is 0
  if (!hasReadToday && !dateSet.has(yesterdayStr)) {
    currentStreak = 0;
  }

  // 2. Longest Streak calculation
  const sortedAsc = Array.from(dateSet).sort();
  let longestStreak = 0;
  let runningStreak = 0;
  let prevTimestamp = null;

  for (const dStr of sortedAsc) {
    const parts = dStr.split('-').map(Number);
    const currDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    const currTimestamp = currDate.getTime();

    if (prevTimestamp === null) {
      runningStreak = 1;
    } else {
      const diffDays = Math.round((currTimestamp - prevTimestamp) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        runningStreak += 1;
      } else if (diffDays > 1) {
        runningStreak = 1;
      }
    }

    if (runningStreak > longestStreak) {
      longestStreak = runningStreak;
    }
    prevTimestamp = currTimestamp;
  }

  return {
    currentStreak,
    longestStreak,
    hasReadToday,
  };
}
