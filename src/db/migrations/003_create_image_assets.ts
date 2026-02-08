/**
 * Migration 003: Create Image Assets Table
 *
 * Creates the image_assets table for storing image metadata associated with notes.
 * Each note can have multiple images.
 */

import type { Migration } from './types.js';

const migration: Migration = {
  name: '003_create_image_assets',

  up: `
    CREATE TABLE IF NOT EXISTS image_assets (
      id VARCHAR(255) PRIMARY KEY,
      note_id VARCHAR(255) NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      alt_text VARCHAR(500) NOT NULL DEFAULT ''
    );

    CREATE INDEX idx_image_assets_note_id ON image_assets (note_id);
  `,

  down: `
    DROP TABLE IF EXISTS image_assets CASCADE;
  `,
};

export default migration;
