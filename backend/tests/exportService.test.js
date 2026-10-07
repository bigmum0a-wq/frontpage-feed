import test from 'node:test';
import assert from 'node:assert/strict';

const {
  buildZip,
  generateEpub,
  generateMagazineHtml,
} = await import('../services/epubService.js');

test('EPUB Service: buildZip creates valid standard ZIP binary', () => {
  const files = [
    { path: 'test.txt', content: 'Hello World', compress: false },
    { path: 'sub/doc.txt', content: 'Compressed Content Here!', compress: true },
  ];

  const zipBuffer = buildZip(files);

  assert.ok(Buffer.isBuffer(zipBuffer));
  assert.ok(zipBuffer.length > 50);

  // Magic bytes: 0x50, 0x4b, 0x03, 0x04 ('PK\x03\x04')
  assert.equal(zipBuffer[0], 0x50);
  assert.equal(zipBuffer[1], 0x4b);
  assert.equal(zipBuffer[2], 0x03);
  assert.equal(zipBuffer[3], 0x04);
});

test('EPUB Service: generateEpub produces valid EPUB 3 archive with metadata, TOC and chapters', () => {
  const articles = [
    {
      id: 'art-1',
      title: 'Guide complet de la performance CSS',
      author: 'Jane Doe',
      feedName: 'Smashing Mag',
      publishedAt: '2026-10-01T10:00:00Z',
      excerpt: 'How to speed up web page rendering.',
      aiSummary: '3 key techniques to eliminate render-blocking.',
      aiTakeaways: ['Utiliser content-visibility', 'Optimiser le chemin critique CSS'],
      aiTags: ['#css', '#performance'],
      url: 'https://example.com/css-perf',
    },
    {
      id: 'art-2',
      title: 'Introduction to LLM Models',
      author: 'John Smith',
      excerpt: 'Comprendre les transformers.',
      url: 'https://example.com/llm-intro',
    },
  ];

  const epubBuffer = generateEpub({
    title: 'FrontPage Hebdo Test',
    author: 'FrontPage',
    articles,
  });

  assert.ok(Buffer.isBuffer(epubBuffer));
  assert.ok(epubBuffer.length > 500);

  // Check magic bytes
  assert.equal(epubBuffer[0], 0x50);
  assert.equal(epubBuffer[1], 0x4b);

  // Convert to string to check for standard EPUB files inside zip directory
  const raw = epubBuffer.toString('binary');
  assert.ok(raw.includes('mimetype'));
  assert.ok(raw.includes('application/epub+zip'));
  assert.ok(raw.includes('META-INF/container.xml'));
  assert.ok(raw.includes('OEBPS/content.opf'));
  assert.ok(raw.includes('OEBPS/toc.ncx'));
  assert.ok(raw.includes('OEBPS/nav.xhtml'));
  assert.ok(raw.includes('OEBPS/chapter_1.xhtml'));
  assert.ok(raw.includes('OEBPS/chapter_2.xhtml'));
});

test('Magazine Service: generateMagazineHtml outputs clean printable magazine edition', () => {
  const articles = [
    {
      id: 'art-1',
      title: 'Optimisation de performance web',
      author: 'Alice Martin',
      feedName: 'Web Weekly',
      publishedAt: '2026-10-05T08:00:00Z',
      excerpt: 'Tout sur les Core Web Vitals.',
      aiSummary: 'LCP and CLS explained in detail.',
      aiTakeaways: ['Prioritize fonts', 'Defer JavaScript'],
      aiTags: ['#performance', '#cwv'],
      url: 'https://example.com/perf',
    },
  ];

  const html = generateMagazineHtml({
    title: 'Special Tech Edition',
    articles,
  });

  assert.equal(typeof html, 'string');
  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('Special Tech Edition'));
  assert.ok(html.includes('Optimisation de performance web'));
  assert.ok(html.includes('Alice Martin'));
  assert.ok(html.includes('LCP and CLS explained in detail'));
  assert.ok(html.includes('Prioritize fonts'));
  assert.ok(html.includes('window.print()'));
});
