/**
 * Repository Unit Tests
 *
 * Tests for all repository implementations covering:
 * - Base CRUD operations
 * - Note soft delete and restore
 * - Note filtering by platform, status, time range, and category
 * - Entity-specific query methods (findByNoteId, findByUserId, etc.)
 *
 * Requirements: 7.2, 7.4, 7.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BaseRepository } from './base-repository.js';
import { UserRepository } from './user-repository.js';
import { NoteRepository, type NoteWithSoftDelete } from './note-repository.js';
import { PublishRecordRepository } from './publish-record-repository.js';
import { StrategyRepository, type StoredStrategy } from './strategy-repository.js';
import { EngagementRepository, type StoredEngagement } from './engagement-repository.js';
import { CompetitorReportRepository, type StoredCompetitorReport } from './competitor-report-repository.js';
import type { User, PublishRecord } from '../../types/index.js';

// ============================================================
// Test Helpers
// ============================================================

function createTestUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    platformCredentials: {},
    createdAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createTestNote(overrides: Partial<NoteWithSoftDelete> = {}): NoteWithSoftDelete {
  return {
    id: 'note-1',
    userId: 'user-1',
    title: 'Test Note',
    textContent: 'This is test content',
    images: [],
    tags: ['美食', '探店'],
    platform: 'xiaohongshu',
    status: 'draft',
    platformPreview: { platform: 'xiaohongshu', layout: {} },
    createdAt: new Date('2024-06-15'),
    updatedAt: new Date('2024-06-15'),
    deletedAt: null,
    ...overrides,
  };
}

function createTestPublishRecord(overrides: Partial<PublishRecord> = {}): PublishRecord {
  return {
    id: 'pub-1',
    noteId: 'note-1',
    platform: 'xiaohongshu',
    success: true,
    platformUrl: 'https://xiaohongshu.com/note/123',
    publishedAt: new Date('2024-06-15'),
    ...overrides,
  };
}

function createTestStrategy(overrides: Partial<StoredStrategy> = {}): StoredStrategy {
  return {
    id: 'strategy-1',
    userId: 'user-1',
    category: '美食',
    goal: '增加粉丝',
    nodes: [],
    publishReady: true,
    createdAt: new Date('2024-06-15'),
    ...overrides,
  };
}

function createTestEngagement(overrides: Partial<StoredEngagement> = {}): StoredEngagement {
  return {
    id: 'eng-1',
    noteId: 'note-1',
    views: 100,
    likes: 50,
    comments: 10,
    favorites: 20,
    shares: 5,
    updatedAt: new Date('2024-06-15'),
    ...overrides,
  };
}

function createTestCompetitorReport(overrides: Partial<StoredCompetitorReport> = {}): StoredCompetitorReport {
  return {
    id: 'report-1',
    userId: 'user-1',
    target: { type: 'account', value: 'competitor1', platform: 'xiaohongshu' as const },
    contentTrends: [],
    engagementMetrics: {
      averageLikes: 100,
      averageComments: 20,
      averageFavorites: 30,
      averageShares: 10,
      engagementRate: 0.05,
    },
    strategySuggestions: ['Post more frequently'],
    generatedAt: new Date('2024-06-15'),
    publishReady: true,
    ...overrides,
  };
}

// ============================================================
// BaseRepository Tests
// ============================================================

describe('BaseRepository', () => {
  let repo: BaseRepository<{ id: string; name: string }>;

  beforeEach(() => {
    repo = new BaseRepository();
  });

  it('should create an entity', () => {
    const entity = repo.create({ id: '1', name: 'Test' });
    expect(entity).toEqual({ id: '1', name: 'Test' });
  });

  it('should throw when creating a duplicate id', () => {
    repo.create({ id: '1', name: 'Test' });
    expect(() => repo.create({ id: '1', name: 'Other' })).toThrow("Entity with id '1' already exists");
  });

  it('should find an entity by id', () => {
    repo.create({ id: '1', name: 'Test' });
    const found = repo.findById('1');
    expect(found).toEqual({ id: '1', name: 'Test' });
  });

  it('should return undefined for non-existent id', () => {
    expect(repo.findById('nonexistent')).toBeUndefined();
  });

  it('should find all entities', () => {
    repo.create({ id: '1', name: 'A' });
    repo.create({ id: '2', name: 'B' });
    const all = repo.findAll();
    expect(all).toHaveLength(2);
  });

  it('should update an entity', () => {
    repo.create({ id: '1', name: 'Old' });
    const updated = repo.update('1', { name: 'New' });
    expect(updated?.name).toBe('New');
    expect(repo.findById('1')?.name).toBe('New');
  });

  it('should return undefined when updating non-existent entity', () => {
    expect(repo.update('nonexistent', { name: 'New' })).toBeUndefined();
  });

  it('should not allow update to change the id', () => {
    repo.create({ id: '1', name: 'Test' });
    const updated = repo.update('1', { id: 'changed', name: 'New' } as any);
    expect(updated?.id).toBe('1');
  });

  it('should delete an entity', () => {
    repo.create({ id: '1', name: 'Test' });
    expect(repo.delete('1')).toBe(true);
    expect(repo.findById('1')).toBeUndefined();
  });

  it('should return false when deleting non-existent entity', () => {
    expect(repo.delete('nonexistent')).toBe(false);
  });

  it('should count entities', () => {
    expect(repo.count()).toBe(0);
    repo.create({ id: '1', name: 'A' });
    repo.create({ id: '2', name: 'B' });
    expect(repo.count()).toBe(2);
  });

  it('should clear all entities', () => {
    repo.create({ id: '1', name: 'A' });
    repo.create({ id: '2', name: 'B' });
    repo.clear();
    expect(repo.count()).toBe(0);
    expect(repo.findAll()).toEqual([]);
  });

  it('should return copies, not references', () => {
    const original = { id: '1', name: 'Test' };
    repo.create(original);
    const found = repo.findById('1')!;
    found.name = 'Modified';
    expect(repo.findById('1')?.name).toBe('Test');
  });
});

// ============================================================
// UserRepository Tests
// ============================================================

describe('UserRepository', () => {
  let repo: UserRepository;

  beforeEach(() => {
    repo = new UserRepository();
  });

  it('should create and find a user', () => {
    const user = createTestUser();
    repo.create(user);
    const found = repo.findById('user-1');
    expect(found?.name).toBe('Test User');
    expect(found?.email).toBe('test@example.com');
  });

  it('should find a user by email', () => {
    repo.create(createTestUser());
    const found = repo.findByEmail('test@example.com');
    expect(found?.id).toBe('user-1');
  });

  it('should return undefined for non-existent email', () => {
    expect(repo.findByEmail('nonexistent@example.com')).toBeUndefined();
  });
});

// ============================================================
// NoteRepository Tests
// ============================================================

describe('NoteRepository', () => {
  let repo: NoteRepository;

  beforeEach(() => {
    repo = new NoteRepository();
  });

  describe('Basic CRUD', () => {
    it('should create and find a note', () => {
      const note = createTestNote();
      repo.create(note);
      const found = repo.findById('note-1');
      expect(found?.title).toBe('Test Note');
      expect(found?.deletedAt).toBeNull();
    });

    it('should update a note', () => {
      repo.create(createTestNote());
      const updated = repo.update('note-1', { title: 'Updated Title' });
      expect(updated?.title).toBe('Updated Title');
    });

    it('should list all active notes', () => {
      repo.create(createTestNote({ id: 'note-1' }));
      repo.create(createTestNote({ id: 'note-2', title: 'Second Note' }));
      expect(repo.findAll()).toHaveLength(2);
    });
  });

  describe('Soft Delete', () => {
    it('should soft delete a note', () => {
      repo.create(createTestNote());
      const result = repo.softDelete('note-1');
      expect(result).toBe(true);
    });

    it('should not return soft-deleted notes in findAll', () => {
      repo.create(createTestNote({ id: 'note-1' }));
      repo.create(createTestNote({ id: 'note-2' }));
      repo.softDelete('note-1');
      const all = repo.findAll();
      expect(all).toHaveLength(1);
      expect(all[0].id).toBe('note-2');
    });

    it('should not return soft-deleted notes in findById', () => {
      repo.create(createTestNote());
      repo.softDelete('note-1');
      expect(repo.findById('note-1')).toBeUndefined();
    });

    it('should return soft-deleted notes in findByIdIncludingDeleted', () => {
      repo.create(createTestNote());
      repo.softDelete('note-1');
      const found = repo.findByIdIncludingDeleted('note-1');
      expect(found).toBeDefined();
      expect(found?.deletedAt).not.toBeNull();
    });

    it('should return soft-deleted notes in findDeleted', () => {
      repo.create(createTestNote({ id: 'note-1' }));
      repo.create(createTestNote({ id: 'note-2' }));
      repo.softDelete('note-1');
      const deleted = repo.findDeleted();
      expect(deleted).toHaveLength(1);
      expect(deleted[0].id).toBe('note-1');
    });

    it('should return false when soft-deleting non-existent note', () => {
      expect(repo.softDelete('nonexistent')).toBe(false);
    });

    it('should return false when soft-deleting already deleted note', () => {
      repo.create(createTestNote());
      repo.softDelete('note-1');
      expect(repo.softDelete('note-1')).toBe(false);
    });
  });

  describe('Restore', () => {
    it('should restore a soft-deleted note', () => {
      repo.create(createTestNote());
      repo.softDelete('note-1');
      const restored = repo.restore('note-1');
      expect(restored).toBeDefined();
      expect(restored?.deletedAt).toBeNull();
    });

    it('should make restored note appear in findAll again', () => {
      repo.create(createTestNote());
      repo.softDelete('note-1');
      expect(repo.findAll()).toHaveLength(0);
      repo.restore('note-1');
      expect(repo.findAll()).toHaveLength(1);
    });

    it('should preserve note content after soft delete and restore', () => {
      const original = createTestNote({
        title: 'Important Note',
        textContent: 'Critical content here',
        tags: ['重要', '保存'],
      });
      repo.create(original);
      repo.softDelete('note-1');
      repo.restore('note-1');
      const restored = repo.findById('note-1');
      expect(restored?.title).toBe('Important Note');
      expect(restored?.textContent).toBe('Critical content here');
      expect(restored?.tags).toEqual(['重要', '保存']);
    });

    it('should return undefined when restoring non-existent note', () => {
      expect(repo.restore('nonexistent')).toBeUndefined();
    });

    it('should return undefined when restoring active (non-deleted) note', () => {
      repo.create(createTestNote());
      expect(repo.restore('note-1')).toBeUndefined();
    });
  });

  describe('Filtering', () => {
    beforeEach(() => {
      repo.create(createTestNote({
        id: 'note-1',
        platform: 'xiaohongshu',
        status: 'draft',
        tags: ['美食', '探店'],
        createdAt: new Date('2024-06-01'),
        userId: 'user-1',
      }));
      repo.create(createTestNote({
        id: 'note-2',
        platform: 'douyin',
        status: 'published',
        tags: ['旅行', '攻略'],
        createdAt: new Date('2024-06-15'),
        userId: 'user-1',
      }));
      repo.create(createTestNote({
        id: 'note-3',
        platform: 'xiaohongshu',
        status: 'ready',
        tags: ['美食', '食谱'],
        createdAt: new Date('2024-07-01'),
        userId: 'user-2',
      }));
    });

    it('should filter by platform', () => {
      const results = repo.filter({ platform: 'xiaohongshu' });
      expect(results).toHaveLength(2);
      expect(results.every((n) => n.platform === 'xiaohongshu')).toBe(true);
    });

    it('should filter by status', () => {
      const results = repo.filter({ status: 'draft' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('note-1');
    });

    it('should filter by category (tag match)', () => {
      const results = repo.filter({ category: '美食' });
      expect(results).toHaveLength(2);
      expect(results.map((n) => n.id).sort()).toEqual(['note-1', 'note-3']);
    });

    it('should filter by time range (startDate)', () => {
      const results = repo.filter({ startDate: new Date('2024-06-10') });
      expect(results).toHaveLength(2);
      expect(results.map((n) => n.id).sort()).toEqual(['note-2', 'note-3']);
    });

    it('should filter by time range (endDate)', () => {
      const results = repo.filter({ endDate: new Date('2024-06-20') });
      expect(results).toHaveLength(2);
      expect(results.map((n) => n.id).sort()).toEqual(['note-1', 'note-2']);
    });

    it('should filter by time range (startDate and endDate)', () => {
      const results = repo.filter({
        startDate: new Date('2024-06-10'),
        endDate: new Date('2024-06-20'),
      });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('note-2');
    });

    it('should filter by userId', () => {
      const results = repo.filter({ userId: 'user-2' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('note-3');
    });

    it('should combine multiple filter conditions', () => {
      const results = repo.filter({
        platform: 'xiaohongshu',
        category: '美食',
      });
      expect(results).toHaveLength(2);
    });

    it('should return empty array when no notes match', () => {
      const results = repo.filter({ platform: 'weibo' });
      expect(results).toHaveLength(0);
    });

    it('should exclude soft-deleted notes from filter results', () => {
      repo.softDelete('note-1');
      const results = repo.filter({ platform: 'xiaohongshu' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('note-3');
    });

    it('should return all active notes when no filters specified', () => {
      const results = repo.filter({});
      expect(results).toHaveLength(3);
    });
  });

  describe('findByUserId', () => {
    it('should find notes by user ID', () => {
      repo.create(createTestNote({ id: 'note-1', userId: 'user-1' }));
      repo.create(createTestNote({ id: 'note-2', userId: 'user-2' }));
      repo.create(createTestNote({ id: 'note-3', userId: 'user-1' }));
      const results = repo.findByUserId('user-1');
      expect(results).toHaveLength(2);
    });

    it('should exclude soft-deleted notes from findByUserId', () => {
      repo.create(createTestNote({ id: 'note-1', userId: 'user-1' }));
      repo.create(createTestNote({ id: 'note-2', userId: 'user-1' }));
      repo.softDelete('note-1');
      const results = repo.findByUserId('user-1');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('note-2');
    });
  });
});

// ============================================================
// PublishRecordRepository Tests
// ============================================================

describe('PublishRecordRepository', () => {
  let repo: PublishRecordRepository;

  beforeEach(() => {
    repo = new PublishRecordRepository();
  });

  it('should create and find a publish record', () => {
    const record = createTestPublishRecord();
    repo.create(record);
    const found = repo.findById('pub-1');
    expect(found?.noteId).toBe('note-1');
    expect(found?.success).toBe(true);
  });

  it('should find records by noteId', () => {
    repo.create(createTestPublishRecord({ id: 'pub-1', noteId: 'note-1' }));
    repo.create(createTestPublishRecord({ id: 'pub-2', noteId: 'note-1' }));
    repo.create(createTestPublishRecord({ id: 'pub-3', noteId: 'note-2' }));
    const results = repo.findByNoteId('note-1');
    expect(results).toHaveLength(2);
  });

  it('should return empty array for noteId with no records', () => {
    expect(repo.findByNoteId('nonexistent')).toEqual([]);
  });
});

// ============================================================
// StrategyRepository Tests
// ============================================================

describe('StrategyRepository', () => {
  let repo: StrategyRepository;

  beforeEach(() => {
    repo = new StrategyRepository();
  });

  it('should create and find a strategy', () => {
    const strategy = createTestStrategy();
    repo.create(strategy);
    const found = repo.findById('strategy-1');
    expect(found?.category).toBe('美食');
    expect(found?.goal).toBe('增加粉丝');
  });

  it('should find strategies by userId', () => {
    repo.create(createTestStrategy({ id: 'strategy-1', userId: 'user-1' }));
    repo.create(createTestStrategy({ id: 'strategy-2', userId: 'user-2' }));
    repo.create(createTestStrategy({ id: 'strategy-3', userId: 'user-1' }));
    const results = repo.findByUserId('user-1');
    expect(results).toHaveLength(2);
  });

  it('should return empty array for userId with no strategies', () => {
    expect(repo.findByUserId('nonexistent')).toEqual([]);
  });
});

// ============================================================
// EngagementRepository Tests
// ============================================================

describe('EngagementRepository', () => {
  let repo: EngagementRepository;

  beforeEach(() => {
    repo = new EngagementRepository();
  });

  it('should create and find engagement data', () => {
    const data = createTestEngagement();
    repo.create(data);
    const found = repo.findById('eng-1');
    expect(found?.views).toBe(100);
    expect(found?.likes).toBe(50);
  });

  it('should find engagement data by noteId', () => {
    repo.create(createTestEngagement({ id: 'eng-1', noteId: 'note-1' }));
    repo.create(createTestEngagement({ id: 'eng-2', noteId: 'note-1' }));
    repo.create(createTestEngagement({ id: 'eng-3', noteId: 'note-2' }));
    const results = repo.findByNoteId('note-1');
    expect(results).toHaveLength(2);
  });

  it('should return empty array for noteId with no engagement data', () => {
    expect(repo.findByNoteId('nonexistent')).toEqual([]);
  });
});

// ============================================================
// CompetitorReportRepository Tests
// ============================================================

describe('CompetitorReportRepository', () => {
  let repo: CompetitorReportRepository;

  beforeEach(() => {
    repo = new CompetitorReportRepository();
  });

  it('should create and find a competitor report', () => {
    const report = createTestCompetitorReport();
    repo.create(report);
    const found = repo.findById('report-1');
    expect(found?.publishReady).toBe(true);
    expect(found?.strategySuggestions).toEqual(['Post more frequently']);
  });

  it('should find reports by userId', () => {
    repo.create(createTestCompetitorReport({ id: 'report-1', userId: 'user-1' }));
    repo.create(createTestCompetitorReport({ id: 'report-2', userId: 'user-2' }));
    repo.create(createTestCompetitorReport({ id: 'report-3', userId: 'user-1' }));
    const results = repo.findByUserId('user-1');
    expect(results).toHaveLength(2);
  });

  it('should return empty array for userId with no reports', () => {
    expect(repo.findByUserId('nonexistent')).toEqual([]);
  });
});
