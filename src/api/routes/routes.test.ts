/**
 * API Routes Unit Tests
 *
 * Tests the Express route handlers by creating a real Express app
 * and testing with direct request simulation via the app's handler.
 * Uses Vitest for testing.
 *
 * Tests cover:
 * - Request validation (missing required fields return 400)
 * - Correct service method delegation
 * - Response format correctness
 * - Error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import type { Application } from 'express';
import { createApp } from '../app.js';
import { clearAllContexts } from '../../services/conversation-engine.js';
import { clearAllPlans } from '../../services/task-orchestrator.js';
import { clearNoteStore } from '../../services/content-generator.js';
import { clearPublishStores } from '../../services/publish-channel.js';
import { clearStrategyStore } from '../../services/strategy-planner.js';
import { clearAnalyticsStore } from '../../services/analytics-service.js';
import { noteRepository } from './note-routes.js';
import type { NoteWithSoftDelete } from '../../db/repositories/note-repository.js';
import type { Platform, NoteStatus, PlatformPreview, ImageAsset } from '../../types/index.js';

// ============================================================
// Test Helpers
// ============================================================

/**
 * Simple HTTP request helper that uses Node's built-in http module
 * to make requests to the Express app.
 */
async function makeRequest(
  app: Application,
  method: string,
  path: string,
  body?: Record<string, unknown>,
  query?: Record<string, string>
): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    // Build query string
    let fullPath = path;
    if (query) {
      const params = new URLSearchParams(query);
      fullPath = `${path}?${params.toString()}`;
    }

    // Create a mock request/response pair
    const req = {
      method: method.toUpperCase(),
      url: fullPath,
      headers: { 'content-type': 'application/json' },
      body: body || {},
    };

    // Use a simulated approach: create a real HTTP server temporarily
    const http = require('http');
    const server = http.createServer(app);

    server.listen(0, () => {
      const port = server.address().port;
      const options = {
        hostname: 'localhost',
        port,
        path: fullPath,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const request = http.request(options, (response: any) => {
        let data = '';
        response.on('data', (chunk: string) => { data += chunk; });
        response.on('end', () => {
          server.close();
          try {
            resolve({
              status: response.statusCode,
              body: JSON.parse(data),
            });
          } catch {
            resolve({
              status: response.statusCode,
              body: { raw: data },
            });
          }
        });
      });

      request.on('error', (err: Error) => {
        server.close();
        reject(err);
      });

      if (body) {
        request.write(JSON.stringify(body));
      }
      request.end();
    });
  });
}

/**
 * Create a test note in the repository
 */
function createTestNoteInRepo(overrides: Partial<NoteWithSoftDelete> = {}): NoteWithSoftDelete {
  const defaultNote: NoteWithSoftDelete = {
    id: `test-note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    title: '测试笔记',
    textContent: '这是一篇测试笔记的内容',
    images: [{
      id: 'img-1',
      url: 'https://example.com/img.jpg',
      width: 1080,
      height: 1080,
      altText: '测试图片',
    }] as ImageAsset[],
    tags: ['#测试', '#笔记'],
    platform: 'xiaohongshu' as Platform,
    status: 'ready' as NoteStatus,
    platformPreview: {
      platform: 'xiaohongshu' as Platform,
      layout: { type: 'card' },
    } as PlatformPreview,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'test-user',
    deletedAt: null,
    ...overrides,
  };

  return noteRepository.create(defaultNote);
}

// ============================================================
// Tests
// ============================================================

describe('API Routes', () => {
  let app: Application;

  beforeEach(() => {
    app = createApp();
    // Clear all stores
    clearAllContexts();
    clearAllPlans();
    clearNoteStore();
    clearPublishStores();
    clearStrategyStore();
    clearAnalyticsStore();
    noteRepository.clear();
  });

  // ============================================================
  // Health Check
  // ============================================================

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const res = await makeRequest(app, 'GET', '/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ============================================================
  // Chat Routes
  // ============================================================

  describe('POST /api/chat', () => {
    it('should return 400 when message is missing', async () => {
      const res = await makeRequest(app, 'POST', '/api/chat', {
        sessionId: 'test-session',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('message');
    });

    it('should return 400 when sessionId is missing', async () => {
      const res = await makeRequest(app, 'POST', '/api/chat', {
        message: '帮我分析竞品',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('sessionId');
    });

    it('should return clarification for low-confidence input', async () => {
      const res = await makeRequest(app, 'POST', '/api/chat', {
        message: '你好',
        sessionId: 'test-session',
      });
      expect(res.status).toBe(200);
      expect(res.body.type).toBe('clarification');
      expect(res.body.message).toBeDefined();
      expect(res.body.sessionId).toBe('test-session');
    });

    it('should return response for valid intent', async () => {
      const res = await makeRequest(app, 'POST', '/api/chat', {
        message: '帮我分析小红书美妆赛道的竞品',
        sessionId: 'test-session',
      });
      expect(res.status).toBe(200);
      expect(res.body.type).toBe('response');
      expect(res.body.intent).toBeDefined();
      expect(res.body.plan).toBeDefined();
      expect(res.body.sessionId).toBe('test-session');
    });
  });

  // ============================================================
  // Note Routes
  // ============================================================

  describe('GET /api/notes', () => {
    it('should return empty list when no notes exist', async () => {
      const res = await makeRequest(app, 'GET', '/api/notes');
      expect(res.status).toBe(200);
      expect(res.body.notes).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('should return notes when they exist', async () => {
      createTestNoteInRepo();
      const res = await makeRequest(app, 'GET', '/api/notes');
      expect(res.status).toBe(200);
      expect((res.body.notes as unknown[]).length).toBe(1);
      expect(res.body.total).toBe(1);
    });

    it('should filter notes by platform', async () => {
      createTestNoteInRepo({ platform: 'xiaohongshu' });
      createTestNoteInRepo({ id: 'note-douyin', platform: 'douyin' });

      const res = await makeRequest(app, 'GET', '/api/notes', undefined, {
        platform: 'xiaohongshu',
      });
      expect(res.status).toBe(200);
      expect((res.body.notes as unknown[]).length).toBe(1);
    });
  });

  describe('GET /api/notes/:id', () => {
    it('should return 404 for non-existent note', async () => {
      const res = await makeRequest(app, 'GET', '/api/notes/non-existent');
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('不存在');
    });

    it('should return note by id', async () => {
      const note = createTestNoteInRepo({ id: 'test-note-123' });
      const res = await makeRequest(app, 'GET', '/api/notes/test-note-123');
      expect(res.status).toBe(200);
      expect((res.body.note as Record<string, unknown>).id).toBe('test-note-123');
    });
  });

  describe('POST /api/notes', () => {
    it('should return 400 when topic is missing', async () => {
      const res = await makeRequest(app, 'POST', '/api/notes', {
        platform: 'xiaohongshu',
        category: '美妆',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('topic');
    });

    it('should return 400 when platform is missing', async () => {
      const res = await makeRequest(app, 'POST', '/api/notes', {
        topic: '护肤推荐',
        category: '美妆',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('platform');
    });

    it('should return 400 when category is missing', async () => {
      const res = await makeRequest(app, 'POST', '/api/notes', {
        topic: '护肤推荐',
        platform: 'xiaohongshu',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('category');
    });

    it('should create a note successfully', async () => {
      const res = await makeRequest(app, 'POST', '/api/notes', {
        topic: '护肤推荐',
        platform: 'xiaohongshu',
        category: '美妆',
      });
      expect(res.status).toBe(201);
      expect(res.body.note).toBeDefined();
      const note = res.body.note as Record<string, unknown>;
      expect(note.title).toBeDefined();
      expect(note.textContent).toBeDefined();
      expect(note.platform).toBe('xiaohongshu');
    });
  });

  describe('DELETE /api/notes/:id', () => {
    it('should return 404 for non-existent note', async () => {
      const res = await makeRequest(app, 'DELETE', '/api/notes/non-existent');
      expect(res.status).toBe(404);
    });

    it('should soft delete a note', async () => {
      createTestNoteInRepo({ id: 'note-to-delete' });
      const res = await makeRequest(app, 'DELETE', '/api/notes/note-to-delete');
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('已删除');

      // Verify note is no longer in active list
      const listRes = await makeRequest(app, 'GET', '/api/notes');
      expect((listRes.body.notes as unknown[]).length).toBe(0);
    });
  });

  // ============================================================
  // Publish Routes
  // ============================================================

  describe('POST /api/publish', () => {
    it('should return 400 when noteId is missing', async () => {
      const res = await makeRequest(app, 'POST', '/api/publish', {
        platform: 'xiaohongshu',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('noteId');
    });

    it('should return 400 when platform is missing', async () => {
      const res = await makeRequest(app, 'POST', '/api/publish', {
        noteId: 'some-note',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('platform');
    });

    it('should return 404 when note does not exist', async () => {
      const res = await makeRequest(app, 'POST', '/api/publish', {
        noteId: 'non-existent',
        platform: 'xiaohongshu',
      });
      expect(res.status).toBe(404);
      expect(res.body.error).toContain('不存在');
    });

    it('should publish a note successfully', async () => {
      const note = createTestNoteInRepo({ id: 'publish-test-note' });
      const res = await makeRequest(app, 'POST', '/api/publish', {
        noteId: 'publish-test-note',
        platform: 'xiaohongshu',
      });
      expect(res.status).toBe(200);
      expect(res.body.result).toBeDefined();
      const result = res.body.result as Record<string, unknown>;
      expect(result.publishId).toBeDefined();
    });
  });

  describe('POST /api/publish/schedule', () => {
    it('should return 400 when noteId is missing', async () => {
      const res = await makeRequest(app, 'POST', '/api/publish/schedule', {
        scheduledTime: new Date().toISOString(),
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('noteId');
    });

    it('should return 400 when scheduledTime is missing', async () => {
      const res = await makeRequest(app, 'POST', '/api/publish/schedule', {
        noteId: 'some-note',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('scheduledTime');
    });

    it('should schedule a publish successfully', async () => {
      createTestNoteInRepo({ id: 'schedule-test-note' });
      const scheduledTime = new Date(Date.now() + 86400000).toISOString();
      const res = await makeRequest(app, 'POST', '/api/publish/schedule', {
        noteId: 'schedule-test-note',
        scheduledTime,
      });
      expect(res.status).toBe(200);
      expect(res.body.result).toBeDefined();
      const result = res.body.result as Record<string, unknown>;
      expect(result.scheduleId).toBeDefined();
      expect(result.noteId).toBe('schedule-test-note');
      expect(result.status).toBe('scheduled');
    });
  });

  // ============================================================
  // Strategy Routes
  // ============================================================

  describe('GET /api/strategies', () => {
    it('should return empty list when no strategies exist', async () => {
      const res = await makeRequest(app, 'GET', '/api/strategies');
      expect(res.status).toBe(200);
      expect(res.body.strategies).toEqual([]);
      expect(res.body.total).toBe(0);
    });
  });

  describe('POST /api/strategies', () => {
    it('should return 400 when category is missing', async () => {
      const res = await makeRequest(app, 'POST', '/api/strategies', {
        goal: '增加粉丝',
        platform: 'xiaohongshu',
        duration: '30days',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('category');
    });

    it('should return 400 when goal is missing', async () => {
      const res = await makeRequest(app, 'POST', '/api/strategies', {
        category: '美妆',
        platform: 'xiaohongshu',
        duration: '30days',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('goal');
    });

    it('should return 400 when platform is missing', async () => {
      const res = await makeRequest(app, 'POST', '/api/strategies', {
        category: '美妆',
        goal: '增加粉丝',
        duration: '30days',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('platform');
    });

    it('should return 400 when duration is missing', async () => {
      const res = await makeRequest(app, 'POST', '/api/strategies', {
        category: '美妆',
        goal: '增加粉丝',
        platform: 'xiaohongshu',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('duration');
    });

    it('should generate a strategy successfully', async () => {
      const res = await makeRequest(app, 'POST', '/api/strategies', {
        category: '美妆',
        goal: '增加粉丝',
        platform: 'xiaohongshu',
        duration: '7days',
      });
      expect(res.status).toBe(201);
      expect(res.body.strategy).toBeDefined();
      const strategy = res.body.strategy as Record<string, unknown>;
      expect(strategy.id).toBeDefined();
      expect(strategy.category).toBe('美妆');
      expect(strategy.goal).toBe('增加粉丝');
      expect((strategy.nodes as unknown[]).length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // Analytics Routes
  // ============================================================

  describe('GET /api/analytics/summary', () => {
    it('should return 400 when startDate is missing', async () => {
      const res = await makeRequest(app, 'GET', '/api/analytics/summary', undefined, {
        endDate: new Date().toISOString(),
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('startDate');
    });

    it('should return 400 when endDate is missing', async () => {
      const res = await makeRequest(app, 'GET', '/api/analytics/summary', undefined, {
        startDate: new Date().toISOString(),
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('endDate');
    });

    it('should return summary for valid time range', async () => {
      const res = await makeRequest(app, 'GET', '/api/analytics/summary', undefined, {
        startDate: new Date(Date.now() - 86400000 * 7).toISOString(),
        endDate: new Date().toISOString(),
      });
      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      const summary = res.body.summary as Record<string, unknown>;
      expect(summary.totalNotes).toBeDefined();
      expect(summary.totalViews).toBeDefined();
      expect(summary.totalLikes).toBeDefined();
    });
  });

  describe('GET /api/analytics/comments/:noteId', () => {
    it('should return comment analysis for a note', async () => {
      const res = await makeRequest(app, 'GET', '/api/analytics/comments/test-note-1');
      expect(res.status).toBe(200);
      expect(res.body.analysis).toBeDefined();
      const analysis = res.body.analysis as Record<string, unknown>;
      expect(analysis.noteId).toBe('test-note-1');
      expect(analysis.totalComments).toBeDefined();
      expect(analysis.sentimentDistribution).toBeDefined();
    });
  });

  // ============================================================
  // Competitor Routes
  // ============================================================

  describe('GET /api/competitors/report', () => {
    it('should return 400 when type is missing', async () => {
      const res = await makeRequest(app, 'GET', '/api/competitors/report', undefined, {
        value: '美妆博主',
        platform: 'xiaohongshu',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('type');
    });

    it('should return 400 when value is missing', async () => {
      const res = await makeRequest(app, 'GET', '/api/competitors/report', undefined, {
        type: 'keyword',
        platform: 'xiaohongshu',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('value');
    });

    it('should return 400 when platform is missing', async () => {
      const res = await makeRequest(app, 'GET', '/api/competitors/report', undefined, {
        type: 'keyword',
        value: '美妆',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('platform');
    });

    it('should generate a competitor report', async () => {
      const res = await makeRequest(app, 'GET', '/api/competitors/report', undefined, {
        type: 'keyword',
        value: '美妆',
        platform: 'xiaohongshu',
      });
      expect(res.status).toBe(200);
      expect(res.body.report).toBeDefined();
      const report = res.body.report as Record<string, unknown>;
      expect(report.id).toBeDefined();
      expect(report.publishReady).toBe(true);
      expect((report.contentTrends as unknown[]).length).toBeGreaterThan(0);
      expect((report.strategySuggestions as unknown[]).length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/trending', () => {
    it('should return 400 when platform is missing', async () => {
      const res = await makeRequest(app, 'GET', '/api/trending');
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('platform');
    });

    it('should return trending topics', async () => {
      const res = await makeRequest(app, 'GET', '/api/trending', undefined, {
        platform: 'xiaohongshu',
      });
      expect(res.status).toBe(200);
      expect(res.body.topics).toBeDefined();
      expect((res.body.topics as unknown[]).length).toBeGreaterThan(0);
      expect(res.body.total).toBeGreaterThan(0);
    });

    it('should filter trending topics by category', async () => {
      const res = await makeRequest(app, 'GET', '/api/trending', undefined, {
        platform: 'xiaohongshu',
        category: '美妆',
      });
      expect(res.status).toBe(200);
      expect(res.body.topics).toBeDefined();
      // All returned topics should be in the 美妆 category
      const topics = res.body.topics as Array<Record<string, unknown>>;
      for (const topic of topics) {
        expect(topic.category).toBe('美妆');
      }
    });
  });
});
