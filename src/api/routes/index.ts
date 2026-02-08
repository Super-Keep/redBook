/**
 * Main API Router
 *
 * Mounts all sub-routers under their respective paths:
 * - /api/chat -> chat-routes
 * - /api/notes -> note-routes
 * - /api/publish -> publish-routes
 * - /api/strategies -> strategy-routes
 * - /api/analytics -> analytics-routes
 * - /api/competitors -> competitor-routes (includes /report)
 * - /api/trending -> competitor-routes (trending endpoint)
 */

import { Router } from 'express';
import chatRoutes from './chat-routes.js';
import noteRoutes from './note-routes.js';
import publishRoutes from './publish-routes.js';
import strategyRoutes from './strategy-routes.js';
import analyticsRoutes from './analytics-routes.js';
import competitorRoutes from './competitor-routes.js';

const router = Router();

router.use('/chat', chatRoutes);
router.use('/notes', noteRoutes);
router.use('/publish', publishRoutes);
router.use('/strategies', strategyRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/competitors', competitorRoutes);

// Mount trending at top level /api/trending
// The competitor-routes has a /trending endpoint, so we mount it here
router.get('/trending', (req, res, next) => {
  // Forward to competitor routes' trending handler
  req.url = '/trending';
  competitorRoutes(req, res, next);
});

export default router;
