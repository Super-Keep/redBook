/**
 * Note Routes - CRUD for /api/notes
 *
 * Handles content management operations:
 * - GET /api/notes - list notes with optional filters
 * - GET /api/notes/:id - get single note
 * - POST /api/notes - create note via ContentGenerator
 * - PUT /api/notes/:id - update note via ContentGenerator.reviseNote
 * - DELETE /api/notes/:id - soft delete note
 *
 * Requirements: 3.1
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { generateNote, reviseNote } from '../../services/content-generator.js';
import { NoteRepository } from '../../db/repositories/note-repository.js';
import type { NoteFilterOptions } from '../../db/repositories/note-repository.js';
import type { Platform, NoteStatus } from '../../types/index.js';

const router = Router();
const noteRepository = new NoteRepository();

/**
 * GET /api/notes
 *
 * List notes with optional filters:
 * - platform: filter by platform
 * - status: filter by note status
 * - category: filter by category (tag match)
 * - startDate: filter by creation date (ISO string)
 * - endDate: filter by creation date (ISO string)
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { platform, status, category, startDate, endDate } = req.query;

    const filterOptions: NoteFilterOptions = {};

    if (platform && typeof platform === 'string') {
      filterOptions.platform = platform as Platform;
    }
    if (status && typeof status === 'string') {
      filterOptions.status = status as NoteStatus;
    }
    if (category && typeof category === 'string') {
      filterOptions.category = category;
    }
    if (startDate && typeof startDate === 'string') {
      filterOptions.startDate = new Date(startDate);
    }
    if (endDate && typeof endDate === 'string') {
      filterOptions.endDate = new Date(endDate);
    }

    const hasFilters = Object.keys(filterOptions).length > 0;
    const notes = hasFilters
      ? noteRepository.filter(filterOptions)
      : noteRepository.findAll();

    res.json({ notes, total: notes.length });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: `获取笔记列表失败: ${errorMessage}` });
  }
});

/**
 * GET /api/notes/:id
 *
 * Get a single note by ID.
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const note = noteRepository.findById(req.params.id);
    if (!note) {
      res.status(404).json({ error: '笔记不存在' });
      return;
    }
    res.json({ note });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: `获取笔记失败: ${errorMessage}` });
  }
});

/**
 * POST /api/notes
 *
 * Create a new note using ContentGenerator.
 *
 * Body: { topic: string, platform: Platform, category: string, referenceMaterials?: Material[], style?: ContentStyle }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { topic, platform, category } = req.body;

    if (!topic || typeof topic !== 'string') {
      res.status(400).json({ error: '缺少必填字段: topic' });
      return;
    }
    if (!platform || typeof platform !== 'string') {
      res.status(400).json({ error: '缺少必填字段: platform' });
      return;
    }
    if (!category || typeof category !== 'string') {
      res.status(400).json({ error: '缺少必填字段: category' });
      return;
    }

    const note = await generateNote({
      topic,
      platform: platform as Platform,
      category,
      referenceMaterials: req.body.referenceMaterials,
      style: req.body.style,
    });

    // Store in repository
    noteRepository.create({
      ...note,
      userId: req.body.userId || 'default-user',
      deletedAt: null,
    });

    res.status(201).json({ note });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: `创建笔记失败: ${errorMessage}` });
  }
});

/**
 * PUT /api/notes/:id
 *
 * Update a note using ContentGenerator.reviseNote.
 *
 * Body: { feedback: string }
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { feedback } = req.body;

    if (!feedback || typeof feedback !== 'string') {
      res.status(400).json({ error: '缺少必填字段: feedback' });
      return;
    }

    // Check note exists in repository
    const existing = noteRepository.findById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: '笔记不存在' });
      return;
    }

    const revisedNote = await reviseNote(req.params.id, feedback);

    // Update in repository
    noteRepository.update(req.params.id, {
      ...revisedNote,
      userId: existing.userId,
      deletedAt: null,
    });

    res.json({ note: revisedNote });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: `更新笔记失败: ${errorMessage}` });
  }
});

/**
 * DELETE /api/notes/:id
 *
 * Soft delete a note.
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = noteRepository.softDelete(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: '笔记不存在或已删除' });
      return;
    }
    res.json({ message: '笔记已删除', id: req.params.id });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: `删除笔记失败: ${errorMessage}` });
  }
});

export { noteRepository };
export default router;
