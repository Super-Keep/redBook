/**
 * Migration 006: Create Strategy Nodes Table
 *
 * Creates the strategy_nodes table for individual nodes within a strategy.
 * Each node links to a strategy and optionally to a specific note via note_id,
 * enabling decoupling of strategy planning from content creation.
 */

import type { Migration } from './types.js';

const migration: Migration = {
  name: '006_create_strategy_nodes',

  up: `
    CREATE TABLE IF NOT EXISTS strategy_nodes (
      id VARCHAR(255) PRIMARY KEY,
      strategy_id VARCHAR(255) NOT NULL REFERENCES operation_strategies(id) ON DELETE CASCADE,
      note_id VARCHAR(255) REFERENCES notes(id) ON DELETE SET NULL,
      scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
      topic VARCHAR(500) NOT NULL,
      content_type VARCHAR(100) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'planned'
    );

    CREATE INDEX idx_strategy_nodes_strategy_id ON strategy_nodes (strategy_id);
    CREATE INDEX idx_strategy_nodes_note_id ON strategy_nodes (note_id);
    CREATE INDEX idx_strategy_nodes_scheduled_date ON strategy_nodes (scheduled_date);
  `,

  down: `
    DROP TABLE IF EXISTS strategy_nodes CASCADE;
  `,
};

export default migration;
