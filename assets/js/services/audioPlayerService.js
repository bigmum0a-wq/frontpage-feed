/**
 * audioPlayerService.js — Global TTS Audio Player Singleton
 *
 * Manages a playlist queue of articles, playback state, rate, and events.
 * Uses the Web Speech Synthesis API (zero external dependencies).
 */

const RATES = [0.75, 1, 1.25, 1.5, 2];

const player = {
  queue: [],           // Array of { id, title, feedName, text }
  currentIndex: -1,
  isPlaying: false,
  isPaused: false,
  playbackRate: 1,
  utterance: null,

  // Callbacks (set by UI layer)
  onTrackChange: null,
  onStateChange: null,
};

function dispatch(event) {
  if (event === 'trackChange' && typeof player.onTrackChange === 'function') {
    player.onTrackChange({ ...player.queue[player.currentIndex] ?? null }, player.currentIndex, player.queue.length);
  }
  if (event === 'stateChange' && typeof player.onStateChange === 'function') {
    player.onStateChange({ isPlaying: player.isPlaying, isPaused: player.isPaused, rate: player.playbackRate });
  }
}

function buildText(track) {
  let text = track.title || '';
  if (track.aiSummary) text += `. Résumé : ${track.aiSummary}`;
  else if (track.excerpt) text += `. ${track.excerpt}`;
  return text.trim();
}

function speakCurrent() {
  if (player.currentIndex < 0 || player.currentIndex >= player.queue.length) return;

  window.speechSynthesis.cancel();

  const track = player.queue[player.currentIndex];
  const text = buildText(track);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'fr-FR';
  utterance.rate = player.playbackRate;

  utterance.onstart = () => {
    player.isPlaying = true;
    player.isPaused = false;
    player.utterance = utterance;
    dispatch('stateChange');
    dispatch('trackChange');
  };

  utterance.onend = () => {
    player.utterance = null;
    // Auto-advance to next track
    if (player.currentIndex < player.queue.length - 1) {
      player.currentIndex += 1;
      speakCurrent();
    } else {
      // End of queue
      player.isPlaying = false;
      player.isPaused = false;
      dispatch('stateChange');
    }
  };

  utterance.onerror = (e) => {
    if (e.error === 'interrupted' || e.error === 'canceled') return;
    console.warn('[AudioPlayer] SpeechSynthesis error:', e.error);
    player.isPlaying = false;
    player.isPaused = false;
    dispatch('stateChange');
  };

  window.speechSynthesis.speak(utterance);
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function enqueueAndPlay(articles = []) {
  const tracks = articles.map(articleToTrack);
  player.queue = tracks;
  player.currentIndex = 0;
  speakCurrent();
}

export function addToQueue(article) {
  const track = articleToTrack(article);
  // Avoid duplicate
  if (!player.queue.find((t) => t.id === track.id)) {
    player.queue.push(track);
  }

  // If nothing is playing, start immediately
  if (!player.isPlaying && !player.isPaused) {
    player.currentIndex = player.queue.length - 1;
    speakCurrent();
  }

  dispatch('trackChange');
  return player.queue.length;
}

export function playIndex(index) {
  if (index < 0 || index >= player.queue.length) return;
  player.currentIndex = index;
  speakCurrent();
}

export function pause() {
  if (player.isPlaying && !player.isPaused) {
    window.speechSynthesis.pause();
    player.isPlaying = false;
    player.isPaused = true;
    dispatch('stateChange');
  }
}

export function resume() {
  if (player.isPaused) {
    window.speechSynthesis.resume();
    player.isPlaying = true;
    player.isPaused = false;
    dispatch('stateChange');
  }
}

export function togglePlay() {
  if (player.isPaused) {
    resume();
  } else if (player.isPlaying) {
    pause();
  } else if (player.queue.length > 0) {
    if (player.currentIndex < 0) player.currentIndex = 0;
    speakCurrent();
  }
}

export function next() {
  if (player.currentIndex < player.queue.length - 1) {
    player.currentIndex += 1;
    speakCurrent();
  }
}

export function prev() {
  if (player.currentIndex > 0) {
    player.currentIndex -= 1;
    speakCurrent();
  }
}

export function stop() {
  window.speechSynthesis.cancel();
  player.isPlaying = false;
  player.isPaused = false;
  player.utterance = null;
  dispatch('stateChange');
}

export function cycleRate() {
  const currentIdx = RATES.indexOf(player.playbackRate);
  const nextIdx = (currentIdx + 1) % RATES.length;
  player.playbackRate = RATES[nextIdx];

  // Apply rate change live if currently speaking
  if (player.isPlaying || player.isPaused) {
    const idx = player.currentIndex;
    speakCurrent();
    player.currentIndex = idx;
  }

  dispatch('stateChange');
  return player.playbackRate;
}

export function removeFromQueue(index) {
  if (index < 0 || index >= player.queue.length) return;
  player.queue.splice(index, 1);

  if (player.currentIndex >= player.queue.length) {
    player.currentIndex = player.queue.length - 1;
  }

  dispatch('trackChange');
}

export function clearQueue() {
  stop();
  player.queue = [];
  player.currentIndex = -1;
  dispatch('trackChange');
}

export function getState() {
  return {
    isPlaying: player.isPlaying,
    isPaused: player.isPaused,
    rate: player.playbackRate,
    queueLength: player.queue.length,
    currentIndex: player.currentIndex,
    currentTrack: player.queue[player.currentIndex] ?? null,
    queue: [...player.queue],
  };
}

export function onTrackChange(cb) {
  player.onTrackChange = cb;
}

export function onStateChange(cb) {
  player.onStateChange = cb;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function articleToTrack(article) {
  return {
    id: article.id,
    title: article.title || 'Article sans titre',
    feedName: article.feedName || article.feedId || '',
    excerpt: article.excerpt || '',
    aiSummary: article.aiSummary || '',
  };
}
