import { describe, it, expect } from 'vitest';
import { migrations, getAllUpSQL, getAllDownSQL } from './index.js';
import migration001 from './001_create_users.js';
import migration002 from './002_create_notes.js';
import migration003 from './003_create_image_assets.js';
import migration004 from './004_create_publish_records.js';
import migration005 from './005_create_operation_strategies.js';
import migration006 from './006_create_strategy_nodes.js';
import migration007 from './007_create_engagement_data.js';
import migration008 from './008_create_competitor_reports.js';

describe('Database Migrations', () => {
  describe('Migration structure', () => {
    it('should export exactly 8 migrations', () => {
      expect(migrations).toHaveLength(8);
    });

    it('each migration should have name, up, and down properties', () => {
      for (const migration of migrations) {
        expect(migration).toHaveProperty('name');
        expect(migration).toHaveProperty('up');
        expect(migration).toHaveProperty('down');
        expect(typeof migration.name).toBe('string');
        expect(typeof migration.up).toBe('string');
        expect(typeof migration.down).toBe('string');
        expect(migration.name.length).toBeGreaterThan(0);
        expect(migration.up.length).toBeGreaterThan(0);
        expect(migration.down.length).toBeGreaterThan(0);
      }
    });

    it('each migration up should contain CREATE TABLE', () => {
      for (const migration of migrations) {
        expect(migration.up.toUpperCase()).toContain('CREATE TABLE');
      }
    });

    it('each migration down should contain DROP TABLE', () => {
      for (const migration of migrations) {
        expect(migration.down.toUpperCase()).toContain('DROP TABLE');
      }
    });
  });

  describe('Migration ordering', () => {
    it('should have migrations in correct sequential order', () => {
      const expectedOrder = [
        '001_create_users',
        '002_create_notes',
        '003_create_image_assets',
        '004_create_publish_records',
        '005_create_operation_strategies',
        '006_create_strategy_nodes',
        '007_create_engagement_data',
        '008_create_competitor_reports',
      ];
      const actualOrder = migrations.map((m) => m.name);
      expect(actualOrder).toEqual(expectedOrder);
    });

    it('users table should be created before tables that reference it', () => {
      const userIndex = migrations.findIndex((m) => m.name.includes('users'));
      const noteIndex = migrations.findIndex((m) => m.name.includes('notes'));
      const strategyIndex = migrations.findIndex((m) => m.name.includes('operation_strategies'));
      const reportIndex = migrations.findIndex((m) => m.name.includes('competitor_reports'));
      expect(userIndex).toBeLessThan(noteIndex);
      expect(userIndex).toBeLessThan(strategyIndex);
      expect(userIndex).toBeLessThan(reportIndex);
    });

    it('notes table should be created before tables that reference it', () => {
      const noteIndex = migrations.findIndex((m) => m.name.includes('notes'));
      const imageIndex = migrations.findIndex((m) => m.name.includes('image_assets'));
      const publishIndex = migrations.findIndex((m) => m.name.includes('publish_records'));
      const engagementIndex = migrations.findIndex((m) => m.name.includes('engagement_data'));
      const strategyNodeIndex = migrations.findIndex((m) => m.name.includes('strategy_nodes'));
      expect(noteIndex).toBeLessThan(imageIndex);
      expect(noteIndex).toBeLessThan(publishIndex);
      expect(noteIndex).toBeLessThan(engagementIndex);
      expect(noteIndex).toBeLessThan(strategyNodeIndex);
    });

    it('operation_strategies should be created before strategy_nodes', () => {
      const strategyIndex = migrations.findIndex((m) => m.name.includes('operation_strategies'));
      const nodeIndex = migrations.findIndex((m) => m.name.includes('strategy_nodes'));
      expect(strategyIndex).toBeLessThan(nodeIndex);
    });
  });

  describe('001 - Users table', () => {
    it('should create users table with required columns', () => {
      const sql = migration001.up.toLowerCase();
      expect(sql).toContain('create table');
      expect(sql).toContain('users');
      expect(sql).toContain('id');
      expect(sql).toContain('name');
      expect(sql).toContain('email');
      expect(sql).toContain('platform_credentials');
      expect(sql).toContain('created_at');
    });

    it('should use JSONB for platform_credentials', () => {
      expect(migration001.up.toUpperCase()).toContain('JSONB');
    });

    it('should use TIMESTAMP WITH TIME ZONE for timestamps', () => {
      expect(migration001.up.toUpperCase()).toContain('TIMESTAMP WITH TIME ZONE');
    });

    it('should drop users table with CASCADE', () => {
      expect(migration001.down.toUpperCase()).toContain('DROP TABLE');
      expect(migration001.down.toUpperCase()).toContain('CASCADE');
    });
  });

  describe('002 - Notes table (with soft delete)', () => {
    it('should create notes table with required columns', () => {
      const sql = migration002.up.toLowerCase();
      expect(sql).toContain('create table');
      expect(sql).toContain('notes');
      expect(sql).toContain('id');
      expect(sql).toContain('user_id');
      expect(sql).toContain('title');
      expect(sql).toContain('text_content');
      expect(sql).toContain('tags');
      expect(sql).toContain('platform');
      expect(sql).toContain('status');
      expect(sql).toContain('platform_preview');
      expect(sql).toContain('created_at');
      expect(sql).toContain('updated_at');
    });

    it('should include deleted_at field for soft delete', () => {
      expect(migration002.up.toLowerCase()).toContain('deleted_at');
    });

    it('should set deleted_at default to NULL', () => {
      expect(migration002.up.toUpperCase()).toMatch(/DELETED_AT\s+TIMESTAMP\s+WITH\s+TIME\s+ZONE\s+DEFAULT\s+NULL/);
    });

    it('should create index on deleted_at for efficient soft delete queries', () => {
      expect(migration002.up.toLowerCase()).toContain('idx_notes_deleted_at');
    });

    it('should reference users table via foreign key', () => {
      expect(migration002.up.toUpperCase()).toContain('REFERENCES USERS(ID)');
    });

    it('should use JSONB for tags and platform_preview', () => {
      const sql = migration002.up.toUpperCase();
      const jsonbMatches = sql.match(/JSONB/g);
      expect(jsonbMatches).not.toBeNull();
      expect(jsonbMatches!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('003 - Image Assets table', () => {
    it('should create image_assets table with required columns', () => {
      const sql = migration003.up.toLowerCase();
      expect(sql).toContain('create table');
      expect(sql).toContain('image_assets');
      expect(sql).toContain('id');
      expect(sql).toContain('note_id');
      expect(sql).toContain('url');
      expect(sql).toContain('width');
      expect(sql).toContain('height');
      expect(sql).toContain('alt_text');
    });

    it('should reference notes table', () => {
      expect(migration003.up.toUpperCase()).toContain('REFERENCES NOTES(ID)');
    });
  });

  describe('004 - Publish Records table', () => {
    it('should create publish_records table with required columns', () => {
      const sql = migration004.up.toLowerCase();
      expect(sql).toContain('create table');
      expect(sql).toContain('publish_records');
      expect(sql).toContain('id');
      expect(sql).toContain('note_id');
      expect(sql).toContain('platform');
      expect(sql).toContain('success');
      expect(sql).toContain('platform_url');
      expect(sql).toContain('error');
      expect(sql).toContain('published_at');
    });

    it('should reference notes table', () => {
      expect(migration004.up.toUpperCase()).toContain('REFERENCES NOTES(ID)');
    });
  });

  describe('005 - Operation Strategies table', () => {
    it('should create operation_strategies table with required columns', () => {
      const sql = migration005.up.toLowerCase();
      expect(sql).toContain('create table');
      expect(sql).toContain('operation_strategies');
      expect(sql).toContain('id');
      expect(sql).toContain('user_id');
      expect(sql).toContain('category');
      expect(sql).toContain('goal');
      expect(sql).toContain('publish_ready');
      expect(sql).toContain('created_at');
    });

    it('should reference users table', () => {
      expect(migration005.up.toUpperCase()).toContain('REFERENCES USERS(ID)');
    });
  });

  describe('006 - Strategy Nodes table', () => {
    it('should create strategy_nodes table with required columns', () => {
      const sql = migration006.up.toLowerCase();
      expect(sql).toContain('create table');
      expect(sql).toContain('strategy_nodes');
      expect(sql).toContain('id');
      expect(sql).toContain('strategy_id');
      expect(sql).toContain('note_id');
      expect(sql).toContain('scheduled_date');
      expect(sql).toContain('topic');
      expect(sql).toContain('content_type');
      expect(sql).toContain('status');
    });

    it('should reference operation_strategies table', () => {
      expect(migration006.up.toUpperCase()).toContain('REFERENCES OPERATION_STRATEGIES(ID)');
    });

    it('should reference notes table with SET NULL on delete', () => {
      const sql = migration006.up.toUpperCase();
      expect(sql).toContain('REFERENCES NOTES(ID)');
      expect(sql).toContain('ON DELETE SET NULL');
    });
  });

  describe('007 - Engagement Data table', () => {
    it('should create engagement_data table with required columns', () => {
      const sql = migration007.up.toLowerCase();
      expect(sql).toContain('create table');
      expect(sql).toContain('engagement_data');
      expect(sql).toContain('id');
      expect(sql).toContain('note_id');
      expect(sql).toContain('views');
      expect(sql).toContain('likes');
      expect(sql).toContain('comments');
      expect(sql).toContain('favorites');
      expect(sql).toContain('updated_at');
    });

    it('should reference notes table', () => {
      expect(migration007.up.toUpperCase()).toContain('REFERENCES NOTES(ID)');
    });

    it('should create index on updated_at for time series queries', () => {
      expect(migration007.up.toLowerCase()).toContain('idx_engagement_data_updated_at');
    });
  });

  describe('008 - Competitor Reports table', () => {
    it('should create competitor_reports table with required columns', () => {
      const sql = migration008.up.toLowerCase();
      expect(sql).toContain('create table');
      expect(sql).toContain('competitor_reports');
      expect(sql).toContain('id');
      expect(sql).toContain('user_id');
      expect(sql).toContain('target');
      expect(sql).toContain('strategy_suggestions');
      expect(sql).toContain('publish_ready');
      expect(sql).toContain('generated_at');
    });

    it('should reference users table', () => {
      expect(migration008.up.toUpperCase()).toContain('REFERENCES USERS(ID)');
    });

    it('should use JSONB for target and strategy_suggestions', () => {
      const sql = migration008.up.toUpperCase();
      const jsonbMatches = sql.match(/JSONB/g);
      expect(jsonbMatches).not.toBeNull();
      expect(jsonbMatches!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Helper functions', () => {
    it('getAllUpSQL should return combined SQL for all migrations', () => {
      const sql = getAllUpSQL();
      expect(sql).toContain('users');
      expect(sql).toContain('notes');
      expect(sql).toContain('image_assets');
      expect(sql).toContain('publish_records');
      expect(sql).toContain('operation_strategies');
      expect(sql).toContain('strategy_nodes');
      expect(sql).toContain('engagement_data');
      expect(sql).toContain('competitor_reports');
    });

    it('getAllDownSQL should return combined SQL for reverting all migrations', () => {
      const sql = getAllDownSQL();
      expect(sql.toUpperCase()).toContain('DROP TABLE');
      const competitorPos = sql.indexOf('competitor_reports');
      const usersPos = sql.indexOf('users');
      expect(competitorPos).toBeLessThan(usersPos);
    });
  });

  describe('Soft delete mechanism', () => {
    it('only notes table should have deleted_at field', () => {
      expect(migration002.up.toLowerCase()).toContain('deleted_at');
      expect(migration001.up.toLowerCase()).not.toContain('deleted_at');
      expect(migration003.up.toLowerCase()).not.toContain('deleted_at');
      expect(migration004.up.toLowerCase()).not.toContain('deleted_at');
      expect(migration005.up.toLowerCase()).not.toContain('deleted_at');
      expect(migration006.up.toLowerCase()).not.toContain('deleted_at');
      expect(migration007.up.toLowerCase()).not.toContain('deleted_at');
      expect(migration008.up.toLowerCase()).not.toContain('deleted_at');
    });

    it('deleted_at should be a TIMESTAMP WITH TIME ZONE column', () => {
      expect(migration002.up.toUpperCase()).toMatch(/DELETED_AT\s+TIMESTAMP\s+WITH\s+TIME\s+ZONE/);
    });
  });

  describe('UTC timezone compliance', () => {
    it('all timestamp columns should use TIMESTAMP WITH TIME ZONE', () => {
      for (const migration of migrations) {
        if (migration.up.toLowerCase().includes('timestamp')) {
          expect(migration.up.toUpperCase()).toContain('TIMESTAMP WITH TIME ZONE');
        }
      }
    });
  });
});
