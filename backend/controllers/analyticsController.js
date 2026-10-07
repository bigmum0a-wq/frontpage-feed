// Analytics Controller
import { AnalyticsModel } from '../models/analyticsModel.js';

export const AnalyticsController = {
  /**
   * GET /api/analytics/overview
   */
  async getOverview(req, res, next) {
    try {
      const userId = req.headers['x-user-id'] || 'guest-user-001';
      const overview = await AnalyticsModel.getOverview(userId);
      res.json({ success: true, data: overview });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/analytics/activity
   */
  async getActivityHeatmap(req, res, next) {
    try {
      const userId = req.headers['x-user-id'] || 'guest-user-001';
      const activity = await AnalyticsModel.getActivityHeatmap(userId);
      res.json({ success: true, data: activity });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/analytics/breakdown
   */
  async getBreakdown(req, res, next) {
    try {
      const userId = req.headers['x-user-id'] || 'guest-user-001';
      const breakdown = await AnalyticsModel.getBreakdown(userId);
      res.json({ success: true, data: breakdown });
    } catch (error) {
      next(error);
    }
  },
};
