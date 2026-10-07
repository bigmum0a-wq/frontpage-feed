/**
 * exportRoutes.js — Routes for EPUB, PDF and Read-it-Later exports
 */
import { Router } from 'express';
import { exportController } from '../controllers/exportController.js';

const router = Router();

router.post('/epub', exportController.exportEpub);
router.post('/magazine', exportController.exportMagazine);

export default router;
