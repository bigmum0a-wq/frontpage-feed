/**
 * epubService.js — EPUB 3 & Magazine HTML Generator (Pure Node.js)
 *
 * Generates standards-compliant EPUB 3 files (readable on Kindle, Kobo, Apple Books)
 * and magazine-formatted printable HTML without any third-party dependencies.
 */
import zlib from 'node:zlib';

// ─── Lightweight ZIP Archive Builder ──────────────────────────────────────────

// Standard CRC32 table
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC32_TABLE[i] = c >>> 0;
}

function computeCrc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Builds a ZIP file buffer from an array of files:
 * files = [{ path: 'mimetype', content: Buffer|string, compress: false }, ...]
 */
export function buildZip(files) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of files) {
    const rawData = Buffer.isBuffer(file.content)
      ? file.content
      : Buffer.from(file.content, 'utf8');

    const fileNameBuf = Buffer.from(file.path, 'utf8');
    const crc = computeCrc32(rawData);

    let compressedData = rawData;
    let method = 0; // Stored (no compression)

    if (file.compress !== false) {
      compressedData = zlib.deflateRawSync(rawData);
      method = 8; // Deflated
    }

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30 + fileNameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4);          // version needed
    localHeader.writeUInt16LE(0, 6);           // flags
    localHeader.writeUInt16LE(method, 8);      // compression method
    localHeader.writeUInt16LE(0, 10);          // mod time
    localHeader.writeUInt16LE(0, 12);          // mod date
    localHeader.writeUInt32LE(crc, 14);        // crc32
    localHeader.writeUInt32LE(compressedData.length, 18); // compressed size
    localHeader.writeUInt32LE(rawData.length, 22);        // uncompressed size
    localHeader.writeUInt16LE(fileNameBuf.length, 26);   // file name length
    localHeader.writeUInt16LE(0, 28);          // extra field length
    fileNameBuf.copy(localHeader, 30);

    localHeaders.push(localHeader, compressedData);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.alloc(46 + fileNameBuf.length);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4);          // version made by
    centralHeader.writeUInt16LE(20, 6);          // version needed
    centralHeader.writeUInt16LE(0, 8);           // flags
    centralHeader.writeUInt16LE(method, 10);     // compression method
    centralHeader.writeUInt16LE(0, 12);          // mod time
    centralHeader.writeUInt16LE(0, 14);          // mod date
    centralHeader.writeUInt32LE(crc, 16);        // crc32
    centralHeader.writeUInt32LE(compressedData.length, 20); // compressed size
    centralHeader.writeUInt32LE(rawData.length, 24);        // uncompressed size
    centralHeader.writeUInt16LE(fileNameBuf.length, 28);   // file name length
    centralHeader.writeUInt16LE(0, 30);          // extra field length
    centralHeader.writeUInt16LE(0, 32);          // comment length
    centralHeader.writeUInt16LE(0, 34);          // disk number
    centralHeader.writeUInt16LE(0, 36);          // internal attributes
    centralHeader.writeUInt32LE(0, 38);          // external attributes
    centralHeader.writeUInt32LE(offset, 42);     // relative offset of local header
    fileNameBuf.copy(centralHeader, 46);

    centralHeaders.push(centralHeader);

    offset += localHeader.length + compressedData.length;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // signature
  eocd.writeUInt16LE(0, 4);          // disk number
  eocd.writeUInt16LE(0, 6);          // start disk
  eocd.writeUInt16LE(files.length, 8);  // entries on disk
  eocd.writeUInt16LE(files.length, 10); // total entries
  eocd.writeUInt32LE(centralDirSize, 12);   // central dir size
  eocd.writeUInt32LE(centralDirOffset, 16); // central dir offset
  eocd.writeUInt16LE(0, 20);          // comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

// ─── EPUB Generation ─────────────────────────────────────────────────────────

export function generateEpub({ title, author = 'FrontPage Digest', articles = [] }) {
  const epubTitle = title || 'FrontPage Digest Hebdomadaire';
  const pubDate = new Date().toISOString().slice(0, 10);
  const bookId = `urn:uuid:frontpage-${Date.now()}`;

  const files = [];

  // 1. mimetype (MUST be first file, uncompressed, exactly "application/epub+zip")
  files.push({
    path: 'mimetype',
    content: 'application/epub+zip',
    compress: false,
  });

  // 2. META-INF/container.xml
  files.push({
    path: 'META-INF/container.xml',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,
  });

  // 3. OEBPS/styles.css (E-ink & dark-mode optimized)
  files.push({
    path: 'OEBPS/styles.css',
    content: `
body {
  font-family: serif;
  line-height: 1.6;
  margin: 1.5em;
  color: #111;
}
h1, h2, h3 { font-family: sans-serif; font-weight: bold; }
h1.book-title { font-size: 2.2em; text-align: center; margin-top: 3em; margin-bottom: 0.2em; }
p.book-subtitle { font-size: 1.1em; text-align: center; color: #555; margin-bottom: 2em; }
p.book-date { text-align: center; font-size: 0.9em; color: #777; }
.article-header { border-bottom: 2px solid #ddd; padding-bottom: 0.8em; margin-bottom: 1.5em; }
.article-meta { font-size: 0.85em; color: #666; font-family: sans-serif; }
.ai-summary-box {
  background: #f4f6f9;
  border-left: 4px solid #2563eb;
  padding: 1em 1.2em;
  margin: 1.5em 0;
  font-size: 0.95em;
}
.ai-summary-box strong { color: #1e3a8a; }
.takeaways-list { margin: 0.5em 0 0 1.2em; padding: 0; }
.takeaways-list li { margin-bottom: 0.3em; }
.tags { font-family: monospace; font-size: 0.85em; color: #4b5563; }
.article-content { margin-top: 1.5em; }
.toc-list { list-style-type: decimal; padding-left: 1.5em; }
.toc-list li { margin-bottom: 0.6em; }
.pagebreak { page-break-after: always; }
`,
  });

  // 4. OEBPS/cover.xhtml
  files.push({
    path: 'OEBPS/cover.xhtml',
    content: `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>${escapeXml(epubTitle)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body class="cover-page">
  <div style="text-align: center; padding-top: 4em;">
    <p style="font-size: 1.2em; letter-spacing: 0.2em; text-transform: uppercase; color: #2563eb; font-weight: bold;">FrontPage Magazine</p>
    <h1 class="book-title">${escapeXml(epubTitle)}</h1>
    <p class="book-subtitle">Special edition generated for e-reader</p>
    <p class="book-date">📅 ${escapeXml(pubDate)} · ${articles.length} articles selected</p>
  </div>
</body>
</html>`,
  });

  // 5. Generate Article Chapters
  const manifestItems = [
    '<item id="styles" href="styles.css" media-type="text/css"/>',
    '<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>',
    '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
  ];

  const spineItems = [
    '<itemref idref="cover"/>',
    '<itemref idref="nav"/>',
  ];

  const ncxNavPoints = [
    `<navPoint id="navpoint-1" playOrder="1">
      <navLabel><text>Couverture</text></navLabel>
      <content src="cover.xhtml"/>
    </navPoint>`,
    `<navPoint id="navpoint-2" playOrder="2">
      <navLabel><text>Sommaire</text></navLabel>
      <content src="nav.xhtml"/>
    </navPoint>`,
  ];

  const tocListItems = [];

  articles.forEach((article, i) => {
    const chapterId = `chapter_${i + 1}`;
    const fileName = `${chapterId}.xhtml`;
    const playOrder = i + 3;

    manifestItems.push(`<item id="${chapterId}" href="${fileName}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="${chapterId}"/>`);
    ncxNavPoints.push(`
      <navPoint id="navpoint-${playOrder}" playOrder="${playOrder}">
        <navLabel><text>${escapeXml(article.title)}</text></navLabel>
        <content src="${fileName}"/>
      </navPoint>
    `);
    tocListItems.push(`<li><a href="${fileName}">${escapeXml(article.title)}</a></li>`);

    const takeawaysHtml = Array.isArray(article.aiTakeaways) && article.aiTakeaways.length > 0
      ? `<ul class="takeaways-list">${article.aiTakeaways.map((t) => `<li>${escapeXml(t)}</li>`).join('')}</ul>`
      : '';

    const summaryBlock = article.aiSummary
      ? `<div class="ai-summary-box">
          <p><strong>✨ AI Summary:</strong> ${escapeXml(article.aiSummary)}</p>
          ${takeawaysHtml}
        </div>`
      : '';

    const tagsHtml = Array.isArray(article.aiTags) && article.aiTags.length > 0
      ? `<p class="tags">${escapeXml(article.aiTags.join(' '))}</p>`
      : '';

    files.push({
      path: `OEBPS/${fileName}`,
      content: `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(article.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div class="article-header">
    <h2>${escapeXml(article.title)}</h2>
    <div class="article-meta">
      ${article.author ? `<span>Par ${escapeXml(article.author)} · </span>` : ''}
      ${article.feedName ? `<span>${escapeXml(article.feedName)} · </span>` : ''}
      <span>${escapeXml(article.publishedAt ? article.publishedAt.slice(0, 10) : '')}</span>
    </div>
    ${tagsHtml}
  </div>

  ${summaryBlock}

  <div class="article-content">
    ${article.content || `<p>${escapeXml(article.excerpt || '')}</p>`}
  </div>

  ${article.url ? `<p style="margin-top: 2em; font-size: 0.8em; color: #888;">Source : <a href="${escapeXml(article.url)}">${escapeXml(article.url)}</a></p>` : ''}
</body>
</html>`,
    });
  });

  // 6. OEBPS/nav.xhtml (EPUB 3 Navigation Document)
  files.push({
    path: 'OEBPS/nav.xhtml',
    content: `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Sommaire</title>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Sommaire</h1>
    <ol class="toc-list">
      ${tocListItems.join('\n      ')}
    </ol>
  </nav>
</body>
</html>`,
  });

  // 7. OEBPS/toc.ncx (EPUB 2 / Kindle backward compatibility)
  files.push({
    path: 'OEBPS/toc.ncx',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${escapeXml(epubTitle)}</text></docTitle>
  <navMap>
    ${ncxNavPoints.join('\n    ')}
  </navMap>
</ncx>`,
  });

  // 8. OEBPS/content.opf
  files.push({
    path: 'OEBPS/content.opf',
    content: `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">${bookId}</dc:identifier>
    <dc:title>${escapeXml(epubTitle)}</dc:title>
    <dc:creator>${escapeXml(author)}</dc:creator>
    <dc:language>fr</dc:language>
    <dc:date>${pubDate}</dc:date>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.[0-9]+Z$/, 'Z')}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`,
  });

  return buildZip(files);
}

// ─── Magazine HTML (Print / PDF) ─────────────────────────────────────────────

export function generateMagazineHtml({ title, articles = [] }) {
  const magTitle = title || 'FrontPage Magazine';
  const pubDate = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const articlesHtml = articles.map((article, i) => {
    const takeaways = Array.isArray(article.aiTakeaways) && article.aiTakeaways.length > 0
      ? `<ul class="mag-takeaways">${article.aiTakeaways.map((t) => `<li>${escapeXml(t)}</li>`).join('')}</ul>`
      : '';

    const summaryBlock = article.aiSummary
      ? `<div class="mag-ai-box">
          <div class="mag-ai-label">✨ AI Summary &amp; Key Takeaways</div>
          <p class="mag-ai-summary">${escapeXml(article.aiSummary)}</p>
          ${takeaways}
        </div>`
      : '';

    const tags = Array.isArray(article.aiTags)
      ? article.aiTags.map((t) => `<span class="mag-tag">${escapeXml(t)}</span>`).join('')
      : '';

    return `
      <article class="mag-article">
        <header class="mag-article-header">
          <div class="mag-article-num">0${i + 1}</div>
          <div class="mag-article-headings">
            <h2 class="mag-article-title">${escapeXml(article.title)}</h2>
            <div class="mag-article-meta">
              ${article.author ? `<span>Par <strong>${escapeXml(article.author)}</strong></span> · ` : ''}
              ${article.feedName ? `<span class="mag-source-pill">${escapeXml(article.feedName)}</span> · ` : ''}
              <span>${escapeXml(article.publishedAt ? article.publishedAt.slice(0, 10) : '')}</span>
            </div>
            <div class="mag-tags-list">${tags}</div>
          </div>
        </header>

        ${summaryBlock}

        <div class="mag-article-body">
          ${article.content || `<p class="mag-lead">${escapeXml(article.excerpt || '')}</p>`}
        </div>

        <footer class="mag-article-footer">
          <span class="mag-source-link">Source : ${escapeXml(article.url || '')}</span>
        </footer>
      </article>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${escapeXml(magTitle)}</title>
  <style>
    @page {
      size: A4;
      margin: 1.8cm 1.5cm;
    }
    @media print {
      body { background: #fff !important; color: #111 !important; }
      .no-print { display: none !important; }
      .mag-article { page-break-inside: avoid; }
      .mag-cover { page-break-after: always; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: Charter, Cambria, Georgia, "Times New Roman", serif;
      line-height: 1.65;
      color: #1e293b;
      background: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .mag-toolbar {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: #fff;
      padding: 0.75rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 100;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: system-ui, sans-serif;
    }
    .mag-btn-print {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 0.5rem 1.2rem;
      border-radius: 0.4rem;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
    }
    .mag-container {
      max-width: 820px;
      margin: 2rem auto;
      background: #fff;
      padding: 3rem 3.5rem;
      box-shadow: 0 4px 24px rgba(0,0,0,0.06);
      border-radius: 0.5rem;
    }
    .mag-cover {
      text-align: center;
      padding: 3rem 0 4rem;
      border-bottom: 3px double #cbd5e1;
      margin-bottom: 3rem;
    }
    .mag-cover-brand {
      font-family: system-ui, sans-serif;
      font-weight: 800;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: #2563eb;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }
    .mag-cover-title {
      font-size: 2.8rem;
      font-weight: 900;
      margin: 0 0 0.75rem;
      color: #0f172a;
      line-height: 1.15;
    }
    .mag-cover-date {
      font-size: 1rem;
      color: #64748b;
      margin: 0;
    }
    .mag-article {
      margin-bottom: 3.5rem;
      padding-bottom: 2.5rem;
      border-bottom: 1px solid #e2e8f0;
    }
    .mag-article:last-child { border-bottom: none; }
    .mag-article-header {
      display: flex;
      gap: 1.25rem;
      align-items: baseline;
      margin-bottom: 1rem;
    }
    .mag-article-num {
      font-family: system-ui, sans-serif;
      font-size: 1.8rem;
      font-weight: 900;
      color: #94a3b8;
      line-height: 1;
    }
    .mag-article-title {
      font-size: 1.6rem;
      margin: 0 0 0.5rem;
      color: #0f172a;
      line-height: 1.3;
    }
    .mag-article-meta {
      font-family: system-ui, sans-serif;
      font-size: 0.85rem;
      color: #64748b;
      margin-bottom: 0.4rem;
    }
    .mag-source-pill {
      background: #eff6ff;
      color: #1e40af;
      padding: 0.15rem 0.5rem;
      border-radius: 9999px;
      font-weight: 600;
      font-size: 0.75rem;
    }
    .mag-tags-list {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }
    .mag-tag {
      font-family: monospace;
      font-size: 0.75rem;
      color: #475569;
      background: #f1f5f9;
      padding: 0.1rem 0.4rem;
      border-radius: 0.25rem;
    }
    .mag-ai-box {
      background: #f8fafc;
      border-left: 4px solid #2563eb;
      padding: 1rem 1.25rem;
      margin: 1.25rem 0;
      border-radius: 0 0.4rem 0.4rem 0;
    }
    .mag-ai-label {
      font-family: system-ui, sans-serif;
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #2563eb;
      margin-bottom: 0.35rem;
    }
    .mag-ai-summary {
      font-size: 0.95rem;
      font-style: italic;
      margin: 0 0 0.5rem;
      color: #334155;
    }
    .mag-takeaways {
      margin: 0;
      padding-left: 1.25rem;
      font-size: 0.88rem;
    }
    .mag-takeaways li { margin-bottom: 0.25rem; }
    .mag-article-body {
      font-size: 1.05rem;
      color: #334155;
    }
    .mag-lead { font-size: 1.1rem; line-height: 1.7; }
    .mag-article-footer {
      margin-top: 1.5rem;
      font-family: system-ui, sans-serif;
      font-size: 0.75rem;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="mag-toolbar no-print">
    <div><strong>FrontPage Edition Imprimable / PDF</strong></div>
    <button class="mag-btn-print" onclick="window.print()">🖨️ Enregistrer en PDF / Imprimer</button>
  </div>

  <div class="mag-container">
    <header class="mag-cover">
      <div class="mag-cover-brand">FrontPage · Édition Magazine</div>
      <h1 class="mag-cover-title">${escapeXml(magTitle)}</h1>
      <p class="mag-cover-date">${pubDate} · ${articles.length} articles</p>
    </header>

    <main>
      ${articlesHtml}
    </main>
  </div>
</body>
</html>`;
}

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
