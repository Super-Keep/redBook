/**
 * Migration 008: Create Competitor Reports Table
 *
 * Creates the competitor_reports table for storing competitor analysis results.
 * Target and strategy suggestions are stored as JSONB for flexible structure.
 */

import type { Migration } from './types.js';

const migration: Migration = {
  name: '008_create_competitor_reports',

  up: `
    CREATE TABLE IF NOT EXISTS competitor_reports (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target JSONB NOT NULL DEFAULT '{}',
      strategy_suggestions JSONB NOT NULL DEFAULT '[]',
      publish_ready BOOLEAN NOT NULL DEFAULT false,
      generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_competitor_reports_user_id ON competitor_reports (user_id);
    CREATE INDEX idx_competitor_reports_generated_at ON competitor_reports (generated_at);
  `,

  down: `
    DROP TABLE IF EXISTS competitor_reports CASCADE;
  `,
};

export default migration;
