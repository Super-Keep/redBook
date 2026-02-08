/**
 * Publish Routes - Publishing endpoints
 *
 * - POST /api/publish - publish a note
 * - POST /api/publish/schedule - schedule a publish
 *
 * Requirements: 4.1
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { publish, schedulePublish } from '../../services/publish-channel.js';
import type { Platform } from '../../types/index.js';
import { noteRepository } from './note-routes.js';

const router = Router();

/**
 * POST /api/publish
 *
 * Publish a note to a platform.
 *
 * Body: { noteId: string, platform: Platform, mode?: 'auto' | 'manual' }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { noteId, platform, mode } = req.body;

    if (!noteId || typeof noteId !== 'string') {
      res.status(400).json({ error: '缺少必填字段: noteId' });
      return;
    }
    if (!platform || typeof platform !== 'string') {
      res.status(400).json({ error: '缺少必填字段: platform' });
      return;
    }

    // Look up the note from the repository
    const note = noteRepository.findById(noteId);
    if (!note) {
      res.status(404).json({ error: '笔记不存在' });
      return;
    }

    const result = await publish(note, {
      platform: platform as Platform,
      mode: mode || 'manual',
    });

    res.json({ result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: `发布失败: ${errorMessage}` });
  }
});

/**
 * POST /api/publish/schedule
 *
 * Schedule a note for future publishing.
 *
 * Body: { noteId: string, scheduledTime: string (ISO date) }
 */
router.post('/schedule', async (req: Request, res: Response) => {
  try {
    const { noteId, scheduledTime } = req.body;

    if (!noteId || typeof noteId !== 'string') {
      res.status(400).json({ error: '缺少必填字段: noteId' });
      return;
    }
    if (!scheduledTime || typeof scheduledTime !== 'string') {
      res.status(400).json({ error: '缺少必填字段: scheduledTime' });
      return;
    }

    // Look up the note from the repository
    const note = noteRepository.findById(noteId);
    if (!note) {
      res.status(404).json({ error: '笔记不存在' });
      return;
    }

    const result = await schedulePublish(note, new Date(scheduledTime));

    res.json({ result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: `定时发布失败: ${errorMessage}` });
  }
});

export default router;
