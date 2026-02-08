/**
 * Competitor Routes - Competitor analysis endpoints
 *
 * - GET /api/competitors/report - generate competitor report
 * - GET /api/trending - get trending topics
 *
 * Requirements: 1.1
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { collectData, generateReport, getTrendingTopicsImpl } from '../../services/competitor-analyzer.js';
import type { Platform } from '../../types/index.js';

const router = Router();

/**
 * GET /api/competitors/report
 *
 * Generate a competitor analysis report.
 *
 * Query params:
 * - type: 'account' | 'keyword' (required)
 * - value: account name or keyword (required)
 * - platform: Platform (required)
 */
router.get('/report', async (req: Request, res: Response) => {
  try {
    const { type, value, platform } = req.query;

    if (!type || typeof type !== 'string') {
      res.status(400).json({ error: '缺少必填参数: type' });
      return;
    }
    if (!value || typeof value !== 'string') {
      res.status(400).json({ error: '缺少必填参数: value' });
      return;
    }
    if (!platform || typeof platform !== 'string') {
      res.status(400).json({ error: '缺少必填参数: platform' });
      return;
    }

    const target = {
      type: type as 'account' | 'keyword',
      value,
      platform: platform as Platform,
    };

    const data = await collectData(target);
    const report = await generateReport(data);

    res.json({ report });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: `生成竞品报告失败: ${errorMessage}` });
  }
});

/**
 * GET /api/trending
 *
 * Get trending topics for a platform.
 *
 * Query params:
 * - platform: Platform (required)
 * - category: optional category filter
 */
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const { platform, category } = req.query;

    if (!platform || typeof platform !== 'string') {
      res.status(400).json({ error: '缺少必填参数: platform' });
      return;
    }

    const topics = await getTrendingTopicsImpl(
      platform as Platform,
      category as string | undefined
    );

    res.json({ topics, total: topics.length });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: `获取热点话题失败: ${errorMessage}` });
  }
});

export default router;
