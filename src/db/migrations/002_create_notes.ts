/**
 * Migration 002: Create Notes Table
 *
 * Creates the notes table for storing content notes.
 * Implements soft delete mechanism via deleted_at field.
 * - When deleted_at is NULL, the note is active
 * - When deleted_at has a timestamp, the note is soft-deleted
 * - Soft-deleted notes can be restored by setting deleted_at back to NULL
 *
 * The platform_preview field stores JSON format platform preview data
 * including layout information needed for rendering.
 *
 * Requirements: 7.5 (soft delete with recovery support)
 */

import type { Migration } from './types.js';

const migration: Migration = {
  name: '002_create_notes',

  up: `
    CREATE TABLE IF NOT EXISTS notes (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(500) NOT NULL,
      text_content TEXT NOT NULL,
      tags JSONB NOT NULL DEFAULT '[]',
      platform VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'draft',
      platform_preview JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
    );

    CREATE INDEX idx_notes_user_id ON notes (user_id);
    CREATE INDEX idx_notes_platform ON notes (platform);
    CREATE INDEX idx_notes_status ON notes (status);
    CREATE INDEX idx_notes_created_at ON notes (created_at);
    CREATE INDEX idx_notes_deleted_at ON notes (deleted_at);

    COMMENT ON COLUMN notes.deleted_at IS 'Soft delete timestamp. NULL means active, non-NULL means deleted. Can be restored by setting back to NULL.';
  `,

  down: `
    DROP TABLE IF EXISTS notes CASCADE;
  `,
};

export default migration;
