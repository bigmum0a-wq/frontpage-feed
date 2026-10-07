// AI Summarization & Synthesis Service (Gemini API + Local Smart Heuristic Fallback)
import { env } from '../../config/environment.js';
import { logger } from '../utils/logger.js';
import { sanitizeString } from '../utils/validator.js';

/**
 * Strips HTML and normalizes whitespace
 */
function cleanText(htmlOrText = '') {
  return htmlOrText
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Common technical and general stop words
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them',
  'we', 'you', 'he', 'she', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'any',
  'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should',
  'now', 'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'en', 'dans', 'pour',
  'par', 'sur', 'avec', 'est', 'sont', 'ce', 'cette', 'ces', 'qui', 'que', 'quoi', 'dont'
]);

/**
 * Smart Local Heuristic Extractive Summarizer (Zero-cost & Offline)
 */
export function extractHeuristicSummary({ title = '', excerpt = '', content = '' }) {
  const fullText = cleanText(content || excerpt || title);
  const words = fullText.toLowerCase().match(/\b[a-z0-9_\-+#.]{2,}\b/gi) || [];
  const readingTime = Math.max(1, Math.round(words.length / 200));

  // 1. Calculate word frequencies
  const wordFreq = new Map();
  for (const w of words) {
    if (!STOP_WORDS.has(w) && w.length > 2 && !/^\d+$/.test(w)) {
      wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    }
  }

  // 2. Extract 3-5 semantic hashtags / tags
  const titleWords = new Set((cleanText(title).toLowerCase().match(/\b[a-z0-9_\-+#.]{2,}\b/gi) || []));
  const sortedKeywords = Array.from(wordFreq.entries())
    .sort((a, b) => {
      const aTitleBoost = titleWords.has(a[0]) ? 3 : 1;
      const bTitleBoost = titleWords.has(b[0]) ? 3 : 1;
      return (b[1] * bTitleBoost) - (a[1] * aTitleBoost);
    })
    .slice(0, 5)
    .map(([w]) => `#${w.charAt(0).toUpperCase() + w.slice(1)}`);

  // 3. Sentence scoring
  const rawSentences = fullText.match(/[^.!?]+[.!?]+/g) || [fullText];
  const sentences = rawSentences.map(s => s.trim()).filter(s => s.length > 25 && s.length < 300);

  if (sentences.length === 0) {
    const fallbackSummary = sanitizeString(excerpt || title, 200);
    return {
      summary: fallbackSummary,
      takeaways: [fallbackSummary],
      tags: sortedKeywords.length ? sortedKeywords : ['#Tech'],
      readingTime,
      source: 'local-heuristic',
    };
  }

  const scoredSentences = sentences.map((sentence, idx) => {
    const sWords = sentence.toLowerCase().match(/\b[a-z0-9_\-+#.]{2,}\b/gi) || [];
    let score = 0;
    for (const sw of sWords) {
      if (wordFreq.has(sw)) score += wordFreq.get(sw);
      if (titleWords.has(sw)) score += 5; // Title similarity boost
    }
    // Boost earlier sentences (lead paragraphs contain highest signal)
    if (idx === 0) score *= 1.5;
    if (idx === 1) score *= 1.3;
    return { sentence, score: score / (sWords.length || 1), index: idx };
  });

  scoredSentences.sort((a, b) => b.score - a.score);

  const top1 = scoredSentences[0]?.sentence || sentences[0];
  const takeaways = scoredSentences
    .slice(0, 3)
    .sort((a, b) => a.index - b.index)
    .map(s => s.sentence.replace(/\s+/g, ' ').trim());

  return {
    summary: top1,
    takeaways: takeaways.length > 0 ? takeaways : [top1],
    tags: sortedKeywords.length >= 2 ? sortedKeywords : ['#Tech', '#News', '#Articles'],
    readingTime,
    source: 'local-heuristic',
  };
}

/**
 * Summarize an individual article using Gemini (if available) with local fallback
 */
export async function summarizeArticle({ title = '', excerpt = '', content = '' }) {
  const apiKey = env.GEMINI_API_KEY;
  const rawContent = cleanText(content || excerpt || title);

  if (!apiKey) {
    return extractHeuristicSummary({ title, excerpt, content });
  }

  try {
    const prompt = `You are an AI assistant specialized in technology news aggregation and monitoring.
Analyze the following article and generate a structured summary in strict JSON format.

Titre: ${title}
Contenu: ${rawContent.slice(0, 4000)}

Respond ONLY with a JSON object strictly following this format:
{
  "summary": "A punchy sentence summarizing the main point (TL;DR).",
  "takeaways": [
    "Key takeaway 1 - learning or novelty",
    "Key takeaway 2",
    "Key takeaway 3"
  ],
  "tags": ["#Tag1", "#Tag2", "#Tag3"],
  "readingTime": 3
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textOutput) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(textOutput);
    return {
      summary: sanitizeString(parsed.summary, 300),
      takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways.slice(0, 3) : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
      readingTime: typeof parsed.readingTime === 'number' ? parsed.readingTime : Math.max(1, Math.round(rawContent.split(/\s+/).length / 200)),
      source: 'gemini',
    };
  } catch (error) {
    logger.warn('AI Service (Gemini) indisponible, bascule sur le moteur heuristique local:', error.message);
    return extractHeuristicSummary({ title, excerpt, content });
  }
}

/**
 * Generate a Daily Briefing / AI Digest across multiple articles
 */
export async function generateDailyDigest(articles = []) {
  if (!articles || articles.length === 0) {
    return {
      briefing: 'No recent articles to summarize for today.',
      topThemes: [],
      date: new Date().toISOString(),
      source: 'local-heuristic',
    };
  }

  const topArticles = articles.slice(0, 8);
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) {
    // Generate synthesized local briefing
    const themes = new Set();
    const bullets = [];

    for (const art of topArticles.slice(0, 4)) {
      const h = extractHeuristicSummary(art);
      bullets.push(`• [${art.feedName || 'Source'}] ${art.title} : ${h.summary}`);
      h.tags.forEach(t => themes.add(t));
    }

    const briefing = `This overview synthesizes the ${topArticles.length} most recent publications from your feeds.\n\n` + bullets.join('\n\n');

    return {
      briefing,
      topThemes: Array.from(themes).slice(0, 6),
      date: new Date().toISOString(),
      source: 'local-heuristic',
    };
  }

  try {
    const listText = topArticles
      .map((a, i) => `${i + 1}. [${a.feedName || 'Source'}] "${a.title}": ${cleanText(a.excerpt).slice(0, 200)}`)
      .join('\n');

    const prompt = `You are the editor-in-chief of a cutting-edge technology news briefing.
Here are the main articles recently published in the user's feeds:

${listText}

Write a concise and engaging morning briefing of 2 short paragraphs in English summarizing key trends, followed by 3 to 5 key themes (#Keywords).
Respond ONLY with strict JSON:
{
  "briefing": "Texte du briefing en 2 paragraphes courts...",
  "topThemes": ["#Theme1", "#Theme2", "#Theme3"]
}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(textOutput);

    return {
      briefing: parsed.briefing,
      topThemes: Array.isArray(parsed.topThemes) ? parsed.topThemes : [],
      date: new Date().toISOString(),
      source: 'gemini',
    };
  } catch (error) {
    logger.warn('AI Digest (Gemini) fallback:', error.message);
    return generateDailyDigest(articles);
  }
}
