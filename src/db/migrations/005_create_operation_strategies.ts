/**
 * Migration 005: Create Operation Strategies Table
 *
 * Creates the operation_strategies table for storing generated operation plans.
 * Each strategy belongs to a user and contains a category, goal, and publish readiness flag.
 */

import type { Migration } from './types.js';

const migration: Migration = {
  name: '005_create_operation_strategies',

  up: `
    CREATE TABLE IF NOT EXISTS operation_strategies (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category VARCHAR(255) NOT NULL,
      goal TEXT NOT NULL,
      publish_ready BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_operation_strategies_user_id ON operation_strategies (user_id);
    CREATE INDEX idx_operation_strategies_category ON operation_strategies (category);
  `,

  down: `
    DROP TABLE IF EXISTS operation_strategies CASCADE;
  `,
};

export default migration;
