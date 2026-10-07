/**
 * audioPlayerUI.js — Persistent floating audio player bar
 *
 * Creates a fixed bottom bar that persists across all views.
 * Connects to audioPlayerService for playback control.
 */
import {
  togglePlay,
  next,
  prev,
  stop,
  cycleRate,
  removeFromQueue,
  clearQueue,
  playIndex,
  getState,
  onTrackChange,
  onStateChange,
} from '../services/audioPlayerService.js';

let barEl = null;
let queuePanelEl = null;
let isQueueOpen = false;

export function initAudioPlayerUI() {
  if (barEl) return; // Already initialized

  // ── Build the persistent player bar ──────────────────────────────────────
  barEl = document.createElement('div');
  barEl.id = 'audio-player-bar';
  barEl.className = 'audio-bar';
  barEl.hidden = true; // Hidden until something is queued
  barEl.setAttribute('role', 'region');
  barEl.setAttribute('aria-label', 'Audio player');

  barEl.innerHTML = `
    <div class="audio-bar-inner">

      <!-- Track Info -->
      <div class="audio-bar-track">
        <div class="audio-bar-icon" aria-hidden="true">🎧</div>
        <div class="audio-bar-info">
          <span class="audio-bar-title" id="audio-bar-title">No article playing</span>
          <span class="audio-bar-feed" id="audio-bar-feed"></span>
        </div>
      </div>

      <!-- Central Controls -->
      <div class="audio-bar-controls">
        <button type="button" class="audio-ctrl-btn" id="audio-btn-prev" title="Previous" aria-label="Previous article">⏮</button>
        <button type="button" class="audio-ctrl-btn audio-ctrl-play" id="audio-btn-play" title="Play / Pause" aria-label="Play or pause">▶</button>
        <button type="button" class="audio-ctrl-btn" id="audio-btn-next" title="Next" aria-label="Next article">⏭</button>
        <button type="button" class="audio-ctrl-btn audio-ctrl-rate" id="audio-btn-rate" title="Change speed" aria-label="Playback speed">1×</button>
      </div>

      <!-- Right Actions -->
      <div class="audio-bar-actions">
        <button type="button" class="audio-action-btn" id="audio-btn-queue" title="Audio queue" aria-label="Open audio queue" aria-expanded="false">
          ☰ <span class="audio-queue-count" id="audio-queue-count">0</span>
        </button>
        <button type="button" class="audio-action-btn audio-action-stop" id="audio-btn-stop" title="Stop and clear" aria-label="Stop playback">✕</button>
      </div>

    </div>

    <!-- Progress bar -->
    <div class="audio-bar-progress" aria-hidden="true">
      <div class="audio-bar-progress-fill" id="audio-progress-fill"></div>
    </div>
  `;

  document.body.appendChild(barEl);

  // ── Build queue panel ─────────────────────────────────────────────────────
  queuePanelEl = document.createElement('div');
  queuePanelEl.id = 'audio-queue-panel';
  queuePanelEl.className = 'audio-queue-panel';
  queuePanelEl.hidden = true;
  queuePanelEl.setAttribute('role', 'dialog');
  queuePanelEl.setAttribute('aria-label', 'Audio queue');

  queuePanelEl.innerHTML = `
    <div class="audio-queue-header">
      <h3>🎵 Audio Queue</h3>
      <div class="audio-queue-header-actions">
        <button type="button" class="audio-action-btn" id="audio-btn-clear" title="Clear queue">🗑 Clear</button>
        <button type="button" class="audio-action-btn" id="audio-btn-queue-close" aria-label="Close queue">✕</button>
      </div>
    </div>
    <ul class="audio-queue-list" id="audio-queue-list" role="list">
      <li class="audio-queue-empty">No articles in queue.</li>
    </ul>
  `;

  document.body.appendChild(queuePanelEl);

  // ── Wire events ───────────────────────────────────────────────────────────
  document.getElementById('audio-btn-play').onclick = togglePlay;
  document.getElementById('audio-btn-prev').onclick = prev;
  document.getElementById('audio-btn-next').onclick = next;
  document.getElementById('audio-btn-rate').onclick = () => {
    const newRate = cycleRate();
    updateRateDisplay(newRate);
  };
  document.getElementById('audio-btn-stop').onclick = () => {
    stop();
    clearQueue();
    barEl.hidden = true;
    closeQueuePanel();
  };
  document.getElementById('audio-btn-queue').onclick = toggleQueuePanel;
  document.getElementById('audio-btn-queue-close').onclick = closeQueuePanel;
  document.getElementById('audio-btn-clear').onclick = () => {
    clearQueue();
    renderQueueList();
    barEl.hidden = true;
    closeQueuePanel();
  };

  // ── Subscribe to service events ───────────────────────────────────────────
  onTrackChange((track, index, total) => {
    updateTrackDisplay(track, index, total);
    renderQueueList();
  });

  onStateChange(({ isPlaying, isPaused, rate }) => {
    updatePlayButton(isPlaying, isPaused);
    updateRateDisplay(rate);
  });

  // Progressive bar animation tick
  startProgressTick();
}

// ── UI Update Helpers ─────────────────────────────────────────────────────────

function updateTrackDisplay(track, index, total) {
  if (!barEl) return;

  const titleEl = document.getElementById('audio-bar-title');
  const feedEl = document.getElementById('audio-bar-feed');
  const countEl = document.getElementById('audio-queue-count');

  if (track) {
    barEl.hidden = false;
    if (titleEl) titleEl.textContent = track.title;
    if (feedEl) feedEl.textContent = track.feedName ? `📻 ${track.feedName}` : '';
  } else {
    if (titleEl) titleEl.textContent = 'No article playing';
    if (feedEl) feedEl.textContent = '';
  }

  if (countEl) countEl.textContent = total || 0;

  // Update prev/next availability
  const prevBtn = document.getElementById('audio-btn-prev');
  const nextBtn = document.getElementById('audio-btn-next');
  if (prevBtn) prevBtn.disabled = index <= 0;
  if (nextBtn) nextBtn.disabled = index >= total - 1;
}

function updatePlayButton(isPlaying, isPaused) {
  const btn = document.getElementById('audio-btn-play');
  if (!btn) return;
  btn.textContent = isPlaying ? '⏸' : '▶';
  btn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
  btn.classList.toggle('is-playing', isPlaying);
}

function updateRateDisplay(rate) {
  const btn = document.getElementById('audio-btn-rate');
  if (!btn) return;
  const display = rate === 1 ? '1×' : `${rate}×`;
  btn.textContent = display;
  btn.title = `Speed: ${display} (click to change)`;
}

function renderQueueList() {
  const listEl = document.getElementById('audio-queue-list');
  if (!listEl) return;

  const { queue, currentIndex } = getState();

  if (!queue || queue.length === 0) {
    listEl.innerHTML = '<li class="audio-queue-empty">No articles in queue.</li>';
    return;
  }

  listEl.innerHTML = queue
    .map((track, i) => `
      <li class="audio-queue-item ${i === currentIndex ? 'is-current' : ''}" data-index="${i}" role="listitem">
        <button class="audio-queue-play-btn" data-index="${i}" title="Play this article" aria-label="Play: ${escapeAttr(track.title)}">
          ${i === currentIndex ? '▶' : '○'}
        </button>
        <div class="audio-queue-item-info">
          <span class="audio-queue-item-title">${escapeHtml(track.title)}</span>
          ${track.feedName ? `<span class="audio-queue-item-feed">${escapeHtml(track.feedName)}</span>` : ''}
        </div>
        <button class="audio-queue-remove-btn" data-index="${i}" title="Remove from queue" aria-label="Remove: ${escapeAttr(track.title)}">✕</button>
      </li>
    `)
    .join('');

  // Attach click events
  listEl.querySelectorAll('.audio-queue-play-btn').forEach((btn) => {
    btn.onclick = () => playIndex(parseInt(btn.dataset.index, 10));
  });

  listEl.querySelectorAll('.audio-queue-remove-btn').forEach((btn) => {
    btn.onclick = () => {
      removeFromQueue(parseInt(btn.dataset.index, 10));
      renderQueueList();
      const { queueLength } = getState();
      const countEl = document.getElementById('audio-queue-count');
      if (countEl) countEl.textContent = queueLength;
      if (queueLength === 0) {
        barEl.hidden = true;
        closeQueuePanel();
      }
    };
  });
}

function toggleQueuePanel() {
  isQueueOpen ? closeQueuePanel() : openQueuePanel();
}

function openQueuePanel() {
  if (!queuePanelEl) return;
  isQueueOpen = true;
  queuePanelEl.hidden = false;
  renderQueueList();
  const qBtn = document.getElementById('audio-btn-queue');
  if (qBtn) qBtn.setAttribute('aria-expanded', 'true');
}

function closeQueuePanel() {
  if (!queuePanelEl) return;
  isQueueOpen = false;
  queuePanelEl.hidden = true;
  const qBtn = document.getElementById('audio-btn-queue');
  if (qBtn) qBtn.setAttribute('aria-expanded', 'false');
}

// ── Progress Bar Simulation ───────────────────────────────────────────────────
// SpeechSynthesis doesn't expose progress directly; we simulate via elapsed time.
let progressInterval = null;
let progressStart = 0;
let progressDuration = 0;

function startProgressTick() {
  progressInterval = setInterval(() => {
    const fillEl = document.getElementById('audio-progress-fill');
    if (!fillEl) return;

    const { isPlaying, currentTrack } = getState();

    if (!isPlaying || !currentTrack) {
      fillEl.style.width = '0%';
      return;
    }

    // Estimate duration from word count at current rate
    const words = ((currentTrack.title || '') + ' ' + (currentTrack.excerpt || '')).split(/\s+/).length;
    const estimatedDuration = Math.max(5, Math.round((words / (130 * getState().rate)) * 60)) * 1000;

    if (progressDuration !== estimatedDuration) {
      progressStart = Date.now();
      progressDuration = estimatedDuration;
    }

    const elapsed = Date.now() - progressStart;
    const pct = Math.min(100, Math.round((elapsed / progressDuration) * 100));
    fillEl.style.width = `${pct}%`;
  }, 500);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
