// Article Routes
import { Router } from 'express';
import { ArticleController } from '../controllers/articleController.js';

const router = Router();

router.get('/', ArticleController.getArticles);
router.post('/digest/ai-generate', ArticleController.generateAiDigest);
router.post('/mark-all-read', ArticleController.markAllAsRead);
router.get('/:id', ArticleController.getArticleById);
router.post('/:id/summarize', ArticleController.summarizeArticle);
router.put('/:id/read', ArticleController.markAsRead);
router.put('/:id/save', ArticleController.toggleSaved);

export default router;
