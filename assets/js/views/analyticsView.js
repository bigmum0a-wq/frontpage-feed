// Analytics Dashboard View
import { api } from '../services/apiService.js';
import { showToast } from '../components/toast.js';

export async function initialiseAnalyticsView() {
  const refreshBtn = document.querySelector('#btn-refresh-analytics');
  if (refreshBtn) {
    refreshBtn.onclick = () => loadAnalyticsData(true);
  }

  await loadAnalyticsData();
}

async function loadAnalyticsData(isManualRefresh = false) {
  try {
    const [overviewRes, activityRes, breakdownRes] = await Promise.all([
      api.getAnalyticsOverview(),
      api.getAnalyticsActivity(),
      api.getAnalyticsBreakdown(),
    ]);

    const overview = overviewRes?.data || {};
    const activity = activityRes?.data || { activityMap: {}, history: [] };
    const breakdown = breakdownRes?.data || { categories: [], topFeeds: [], timeSlots: {}, weekdays: [] };

    renderStreakBanner(overview);
    renderKpis(overview);
    renderActivityHeatmap(activity.activityMap);
    renderCategoryBreakdown(breakdown.categories);
    renderTopFeeds(breakdown.topFeeds);
    renderTimeSlots(breakdown.timeSlots);
    renderWeekdays(breakdown.weekdays);

    if (isManualRefresh) {
      showToast('Statistics refreshed.', 'success');
    }
  } catch (err) {
    console.error('[Analytics] Failed to load analytics:', err);
    showToast('Unable to load analytics data.', 'error');
  }
}

function renderStreakBanner(overview) {
  const container = document.querySelector('#analytics-streak-banner');
  if (!container) return;

  const currentStreak = overview.currentStreak || 0;
  const longestStreak = overview.longestStreak || 0;
  const hasReadToday = Boolean(overview.hasReadToday);

  let statusMsg = '';
  let statusBadge = '';

  if (hasReadToday) {
    statusMsg = `Great job! You read today and kept your streak alive. 🚀`;
    statusBadge = `<span class="streak-badge streak-badge-success">✓ Today's goal achieved</span>`;
  } else if (currentStreak > 0) {
    statusMsg = `Read at least one article today to keep your streak going! ⏱️`;
    statusBadge = `<span class="streak-badge streak-badge-warning">⚡ Complete today</span>`;
  } else {
    statusMsg = `Start a new reading streak today by opening your first article! 📖`;
    statusBadge = `<span class="streak-badge streak-badge-neutral">Ready to start</span>`;
  }

  container.innerHTML = `
    <div class="streak-banner-card">
      <div class="streak-main-metric">
        <div class="streak-fire-icon ${currentStreak > 0 ? 'is-active' : ''}">🔥</div>
        <div>
          <div class="streak-title">
            <span class="streak-days">${currentStreak}</span>
            <span class="streak-unit">${currentStreak === 1 ? 'day streak' : 'days streak'}</span>
          </div>
          <p class="streak-desc">${statusMsg}</p>
        </div>
      </div>

      <div class="streak-records">
        ${statusBadge}
        <div class="streak-record-item">
          <span class="record-icon">🏆</span>
          <div>
            <span class="record-label">All-time best</span>
            <strong class="record-val">${longestStreak} ${longestStreak === 1 ? 'day' : 'days'}</strong>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderKpis(overview) {
  const elRead = document.querySelector('#kpi-total-read');
  const elReadToday = document.querySelector('#kpi-read-today');
  const elTime = document.querySelector('#kpi-total-time');
  const elSavedTime = document.querySelector('#kpi-saved-time');
  const elAiCount = document.querySelector('#kpi-ai-count');
  const elSaved = document.querySelector('#kpi-total-saved');
  const elFeeds = document.querySelector('#kpi-total-feeds');

  if (elRead) elRead.textContent = overview.totalRead || 0;
  if (elReadToday) elReadToday.textContent = `${overview.readToday || 0} read today`;

  if (elTime) {
    elTime.textContent = formatMinutesToHours(overview.totalMinutesRead || 0);
  }

  if (elSavedTime) {
    elSavedTime.textContent = formatMinutesToHours(overview.minutesSavedWithAi || 0);
  }

  if (elAiCount) {
    elAiCount.textContent = `${overview.aiSummariesRead || 0} summaries generated`;
  }

  if (elSaved) elSaved.textContent = overview.totalSaved || 0;
  if (elFeeds) elFeeds.textContent = `${overview.totalFeeds || 0} feeds followed`;
}

function formatMinutesToHours(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
}

function renderActivityHeatmap(activityMap = {}) {
  const container = document.querySelector('#heatmap-wrapper');
  const tooltip = document.querySelector('#heatmap-tooltip');
  if (!container) return;

  const today = new Date();
  const weeksCount = 52;
  const cellSize = 13;
  const cellGap = 3;
  const labelWidth = 32;
  const headerHeight = 22;

  // Compute start date (52 weeks ago, aligned to Monday)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (weeksCount * 7) + (7 - today.getDay()));

  const days = [];
  const curr = new Date(startDate);

  for (let i = 0; i < (weeksCount + 1) * 7; i++) {
    const dStr = curr.toISOString().split('T')[0];
    const count = activityMap[dStr] || 0;
    days.push({
      dateStr: dStr,
      dateObj: new Date(curr),
      dayOfWeek: curr.getDay(), // 0 = Sun, 1 = Mon...
      count,
    });
    curr.setDate(curr.getDate() + 1);
  }

  const svgWidth = labelWidth + ((weeksCount + 1) * (cellSize + cellGap));
  const svgHeight = headerHeight + (7 * (cellSize + cellGap));

  // Month labels along top
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let monthMarkers = [];
  let lastMonth = -1;

  // Build grid columns by week
  let rectsSvg = '';
  let weekIndex = 0;

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    // Map Sunday (0) to bottom (6), Monday (1) to 0
    const dayRow = (day.dayOfWeek + 6) % 7;
    const x = labelWidth + (weekIndex * (cellSize + cellGap));
    const y = headerHeight + (dayRow * (cellSize + cellGap));

    // Check month change
    const m = day.dateObj.getMonth();
    if (m !== lastMonth && dayRow === 0) {
      monthMarkers.push({
        name: monthLabels[m],
        x: x,
      });
      lastMonth = m;
    }

    const lvl = getActivityLevel(day.count);
    const dateFormatted = formatDateEnglish(day.dateObj);

    rectsSvg += `
      <rect
        class="heatmap-cell lvl-${lvl}"
        x="${x}"
        y="${y}"
        width="${cellSize}"
        height="${cellSize}"
        rx="2"
        data-date="${dateFormatted}"
        data-count="${day.count}"
        tabindex="0"
        role="gridcell"
        aria-label="${day.count} articles on ${dateFormatted}"
      />
    `;

    if (dayRow === 6) {
      weekIndex += 1;
    }
  }

  let monthsSvg = monthMarkers
    .map((m) => `<text x="${m.x}" y="14" class="heatmap-axis-label">${m.name}</text>`)
    .join('');

  const weekdaysSvg = `
    <text x="4" y="${headerHeight + 10}" class="heatmap-axis-label">Mon</text>
    <text x="4" y="${headerHeight + (2 * (cellSize + cellGap)) + 10}" class="heatmap-axis-label">Wed</text>
    <text x="4" y="${headerHeight + (4 * (cellSize + cellGap)) + 10}" class="heatmap-axis-label">Fri</text>
  `;

  container.innerHTML = `
    <svg class="heatmap-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMinYMin meet" aria-label="Annual activity heatmap">
      ${monthsSvg}
      ${weekdaysSvg}
      ${rectsSvg}
    </svg>
  `;

  // Attach hover tooltips
  const cells = container.querySelectorAll('.heatmap-cell');
  cells.forEach((cell) => {
    cell.addEventListener('mouseenter', () => {
      if (!tooltip) return;
      const count = cell.getAttribute('data-count');
      const date = cell.getAttribute('data-date');
      const countText = count === '0' ? 'No articles read' : `${count} ${count === '1' ? 'article' : 'articles'} read`;

      tooltip.innerHTML = `<strong>${countText}</strong> <span>on ${date}</span>`;
      tooltip.hidden = false;

      const rect = cell.getBoundingClientRect();
      const parentRect = container.getBoundingClientRect();
      tooltip.style.left = `${rect.left - parentRect.left + (cellSize / 2)}px`;
      tooltip.style.top = `${rect.top - parentRect.top - 34}px`;
    });

    cell.addEventListener('mouseleave', () => {
      if (tooltip) tooltip.hidden = true;
    });
  });
}

function getActivityLevel(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

function formatDateEnglish(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function renderCategoryBreakdown(categories = []) {
  const container = document.querySelector('#category-breakdown-list');
  if (!container) return;

  if (categories.length === 0) {
    container.innerHTML = `<p class="empty-hint">No articles read yet.</p>`;
    return;
  }

  container.innerHTML = categories
    .map(
      (cat) => `
      <div class="category-stat-row">
        <div class="cat-stat-header">
          <div class="cat-badge-info">
            <span class="cat-color-dot" style="background-color: ${cat.categoryColor || '#3b82f6'}"></span>
            <span class="cat-name">${escapeHtml(cat.categoryName)}</span>
          </div>
          <div class="cat-count-info">
            <strong>${cat.count}</strong> <span class="cat-pct">(${cat.percentage}%)</span>
          </div>
        </div>
        <div class="cat-progress-track">
          <div class="cat-progress-fill" style="width: ${cat.percentage}%; background-color: ${cat.categoryColor || '#3b82f6'};"></div>
        </div>
      </div>
    `
    )
    .join('');
}

function renderTopFeeds(feeds = []) {
  const container = document.querySelector('#top-feeds-list');
  if (!container) return;

  if (feeds.length === 0) {
    container.innerHTML = `<p class="empty-hint">No feed activity recorded yet.</p>`;
    return;
  }

  container.innerHTML = feeds
    .map(
      (f, index) => `
      <div class="top-feed-item">
        <span class="top-rank-badge">#${index + 1}</span>
        <div class="feed-avatar-pill" style="background-color: ${f.color || '#2563eb'}">
          ${escapeHtml(f.initials || f.title.slice(0, 2).toUpperCase())}
        </div>
        <div class="feed-details">
          <strong class="feed-title-text">${escapeHtml(f.title)}</strong>
        </div>
        <div class="feed-read-badge">
          <strong>${f.readCount}</strong> read
        </div>
      </div>
    `
    )
    .join('');
}

function renderTimeSlots(timeSlots = {}) {
  const container = document.querySelector('#time-slots-grid');
  if (!container) return;

  const total = (timeSlots.morning || 0) + (timeSlots.afternoon || 0) + (timeSlots.evening || 0) + (timeSlots.night || 0) || 1;

  const slots = [
    { label: 'Morning', hours: '6 AM - 12 PM', icon: '🌅', count: timeSlots.morning || 0 },
    { label: 'Afternoon', hours: '12 PM - 6 PM', icon: '☀️', count: timeSlots.afternoon || 0 },
    { label: 'Evening', hours: '6 PM - 11 PM', icon: '🌆', count: timeSlots.evening || 0 },
    { label: 'Night', hours: '11 PM - 6 AM', icon: '🌙', count: timeSlots.night || 0 },
  ];

  container.innerHTML = slots
    .map((slot) => {
      const pct = Math.round((slot.count / total) * 100);
      return `
        <div class="timeslot-card">
          <div class="timeslot-icon">${slot.icon}</div>
          <div class="timeslot-info">
            <span class="timeslot-name">${slot.label}</span>
            <span class="timeslot-hours">${slot.hours}</span>
          </div>
          <div class="timeslot-metric">
            <strong>${slot.count}</strong>
            <span class="timeslot-pct">${pct}%</span>
          </div>
          <div class="cat-progress-track">
            <div class="cat-progress-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderWeekdays(weekdays = []) {
  const container = document.querySelector('#weekdays-chart');
  if (!container) return;

  const maxCount = Math.max(...weekdays.map((w) => w.count), 1);

  container.innerHTML = `
    <div class="weekdays-bars-container">
      ${weekdays
        .map((w) => {
          const heightPct = Math.round((w.count / maxCount) * 100);
          return `
            <div class="weekday-bar-col" title="${w.day}: ${w.count} articles">
              <div class="weekday-bar-track">
                <div class="weekday-bar-fill" style="height: ${Math.max(8, heightPct)}%;">
                  ${w.count > 0 ? `<span class="weekday-val">${w.count}</span>` : ''}
                </div>
              </div>
              <span class="weekday-label">${w.day}</span>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
