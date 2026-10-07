/**
 * exportController.js — Controller for EPUB and Magazine HTML exports
 */
import { generateEpub, generateMagazineHtml } from '../services/epubService.js';

export const exportController = {
  /**
   * Generates and downloads an EPUB 3 e-book file
   */
  async exportEpub(req, res, next) {
    try {
      const { title, author, articles = [] } = req.body;

      if (!Array.isArray(articles) || articles.length === 0) {
        return res.status(400).json({ error: 'Article list cannot be empty.' });
      }

      const epubBuffer = generateEpub({
        title: title || 'FrontPage Digest',
        author: author || 'FrontPage',
        articles,
      });

      const safeFilename = (title || 'frontpage-digest')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-');

      res.setHeader('Content-Type', 'application/epub+zip');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.epub"`);
      res.setHeader('Content-Length', epubBuffer.length);

      return res.end(epubBuffer);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Generates and serves a standalone Magazine HTML page optimized for PDF printing
   */
  async exportMagazine(req, res, next) {
    try {
      const { title, articles = [] } = req.body;

      if (!Array.isArray(articles) || articles.length === 0) {
        return res.status(400).send('<h1>Erreur</h1><p>Aucun article fourni pour le magazine.</p>');
      }

      const html = generateMagazineHtml({
        title: title || 'FrontPage Magazine Hebdomadaire',
        articles,
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (err) {
      next(err);
    }
  },
};
