/**
 * Express App Setup
 *
 * Configures the Express application with:
 * - JSON body parsing middleware
 * - API router mounting at /api
 * - Basic error handling
 */

import express from 'express';
import apiRouter from './routes/index.js';

/**
 * Create and configure the Express application
 */
export function createApp(): express.Application {
  const app = express();

  // Middleware
  app.use(express.json());

  // Mount API routes
  app.use('/api', apiRouter);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return app;
}

export default createApp;
