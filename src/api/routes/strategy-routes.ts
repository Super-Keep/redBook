/**
 * Strategy Routes - Strategy management endpoints
 *
 * - GET /api/strategies - list strategies
 * - POST /api/strategies - generate a new strategy
 * - PUT /api/strategies/:id/nodes/:nodeId - adjust a strategy node
 *
 * Requirements: 5.1
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { generateStrategy, adjustNode, getStrategyStore } from '../../services/strategy-planner.js';
import type { Platform } from '../../types/index.js';

const router = Router();

/**
 * GET /api/strategies
 *
 * List all strategies.
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const store = getStrategyStore();
    const strategies = Array.from(store.values());
    res.json({ strategies, total: strategies.length });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: `获取策略列表失败: ${errorMessage}` });
  }
});

/**
 * POST /api/strategies
 *
 * Generate a new operation strategy.
 *
 * Body: { category: string, goal: string, platform: Platform, duration: string }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { category, goal, platform, duration } = req.body;

    if (!category || typeof category !== 'string') {
      res.status(400).json({ error: '缺少必填字段: category' });
      return;
    }
    if (!goal || typeof goal !== 'string') {
      res.status(400).json({ error: '缺少必填字段: goal' });
      return;
    }
    if (!platform || typeof platform !== 'string') {
      res.status(400).json({ error: '缺少必填字段: platform' });
      return;
    }
    if (!duration || typeof duration !== 'string') {
      res.status(400).json({ error: '缺少必填字段: duration' });
      return;
    }

    const strategy = await generateStrategy({
      category,
      goal,
      platform: platform as Platform,
      duration,
      competitorReport: req.body.competitorReport,
      trendingTopics: req.body.trendingTopics,
    });

    res.status(201).json({ strategy });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: `生成策略失败: ${errorMessage}` });
  }
});

/**
 * PUT /api/strategies/:id/nodes/:nodeId
 *
 * Adjust a single strategy node.
 *
 * Body: Partial<StrategyNode> (e.g., { topic: string, contentType: string })
 */
router.put('/:id/nodes/:nodeId', async (req: Request, res: Response) => {
  try {
    const { id, nodeId } = req.params;
    const changes = req.body;

    if (!changes || Object.keys(changes).length === 0) {
      res.status(400).json({ error: '请提供要修改的字段' });
      return;
    }

    const strategy = await adjustNode(id, nodeId, changes);

    res.json({ strategy });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('不存在')) {
      res.status(404).json({ error: errorMessage });
      return;
    }
    res.status(500).json({ error: `调整策略节点失败: ${errorMessage}` });
  }
});

export default router;
