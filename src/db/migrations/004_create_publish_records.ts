/**
 * Migration 004: Create Publish Records Table
 *
 * Creates the publish_records table for tracking each publish attempt.
 * Records both successful and failed attempts to support failure retry tracing.
 */

import type { Migration } from './types.js';

const migration: Migration = {
  name: '004_create_publish_records',

  up: `
    CREATE TABLE IF NOT EXISTS publish_records (
      id VARCHAR(255) PRIMARY KEY,
      note_id VARCHAR(255) NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      platform VARCHAR(50) NOT NULL,
      success BOOLEAN NOT NULL DEFAULT false,
      platform_url TEXT,
      error TEXT,
      published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_publish_records_note_id ON publish_records (note_id);
    CREATE INDEX idx_publish_records_platform ON publish_records (platform);
    CREATE INDEX idx_publish_records_published_at ON publish_records (published_at);
  `,

  down: `
    DROP TABLE IF EXISTS publish_records CASCADE;
  `,
};

export default migration;
