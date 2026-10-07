/**
 * audioPlayer.js — Compatibility shim & article TTS entry point
 *
 * Delegates to audioPlayerService (enqueue + play) instead of
 * opening a modal dialog directly.
 */
import { addToQueue, enqueueAndPlay } from '../services/audioPlayerService.js';
import { showToast } from './toast.js';

/**
 * Adds an article to the global audio queue and starts playing if idle.
 * Used from the article reader toolbar.
 */
export function openAudioPlayer({ title, text, article }) {
  if (article) {
    const count = addToQueue(article);
    showToast(`"${title}" added to reading queue (${count} article${count > 1 ? 's' : ''})`, 'info');
  } else {
    // Fallback: play title + text directly as a synthetic article
    enqueueAndPlay([{
      id: `tts-${Date.now()}`,
      title: title || 'Article',
      excerpt: text || '',
      feedName: '',
      aiSummary: '',
    }]);
  }
}
