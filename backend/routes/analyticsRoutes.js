// Analytics Routes
import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController.js';

const router = Router();

router.get('/overview', AnalyticsController.getOverview);
router.get('/activity', AnalyticsController.getActivityHeatmap);
router.get('/breakdown', AnalyticsController.getBreakdown);

export default router;
