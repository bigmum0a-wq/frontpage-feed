// Feed Routes
import { Router } from 'express';
import { FeedController } from '../controllers/feedController.js';

const router = Router();

router.get('/discover', FeedController.discoverFeeds);
router.get('/', FeedController.getFeeds);
router.post('/', FeedController.addFeed);
router.post('/refresh-all', FeedController.refreshAllFeeds);
router.post('/:id/refresh', FeedController.refreshFeed);
router.delete('/:id', FeedController.deleteFeed);

router.get('/export/opml', FeedController.exportOpml);
router.post('/import/opml', FeedController.importOpml);

export default router;
