/**
 * Migration 007: Create Engagement Data Table
 *
 * Creates the engagement_data table for tracking content interaction metrics.
 * Data is stored as time series entries for trend analysis.
 * Each record captures a snapshot of engagement metrics at a point in time.
 */

import type { Migration } from './types.js';

const migration: Migration = {
  name: '007_create_engagement_data',

  up: `
    CREATE TABLE IF NOT EXISTS engagement_data (
      id VARCHAR(255) PRIMARY KEY,
      note_id VARCHAR(255) NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      views INTEGER NOT NULL DEFAULT 0,
      likes INTEGER NOT NULL DEFAULT 0,
      comments INTEGER NOT NULL DEFAULT 0,
      favorites INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_engagement_data_note_id ON engagement_data (note_id);
    CREATE INDEX idx_engagement_data_updated_at ON engagement_data (updated_at);
  `,

  down: `
    DROP TABLE IF EXISTS engagement_data CASCADE;
  `,
};

export default migration;
