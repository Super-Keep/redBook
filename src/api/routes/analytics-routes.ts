/**
 * Analytics Routes - Data analysis endpoints
 *
 * - GET /api/analytics/summary - get operation summary
 * - GET /api/analytics/comments/:noteId - get comment analysis
 *
 * Requirements: 6.2
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { generateSummary, analyzeComments } from '../../services/analytics-service.js';

const router = Router();

/**
 * GET /api/analytics/summary
 *
 * Get operation summary for a time range.
 *
 * Query params:
 * - startDate: ISO date string (required)
 * - endDate: ISO date string (required)
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || typeof startDate !== 'string') {
      res.status(400).json({ error: '缺少必填参数: startDate' });
      return;
    }
    if (!endDate || typeof endDate !== 'string') {
      res.status(400).json({ error: '缺少必填参数: endDate' });
      return;
    }

    const summary = await generateSummary({
      start: new Date(startDate),
      end: new Date(endDate),
    });

    res.json({ summary });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: `获取运营摘要失败: ${errorMessage}` });
  }
});

/**
 * GET /api/analytics/comments/:noteId
 *
 * Get comment analysis for a specific note.
 */
router.get('/comments/:noteId', async (req: Request, res: Response) => {
  try {
    const { noteId } = req.params;

    const analysis = await analyzeComments(noteId);

    res.json({ analysis });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: `获取评论分析失败: ${errorMessage}` });
  }
});

export default router;
