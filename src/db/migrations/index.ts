/**
 * Migration Index
 *
 * Exports all migrations in order. Migrations must be executed sequentially
 * as later migrations may depend on tables created by earlier ones.
 *
 * Migration order:
 * 1. users - Base table, no dependencies
 * 2. notes - Depends on users (user_id FK), includes soft delete
 * 3. image_assets - Depends on notes (note_id FK)
 * 4. publish_records - Depends on notes (note_id FK)
 * 5. operation_strategies - Depends on users (user_id FK)
 * 6. strategy_nodes - Depends on operation_strategies and notes
 * 7. engagement_data - Depends on notes (note_id FK)
 * 8. competitor_reports - Depends on users (user_id FK)
 */

import type { Migration } from './types.js';
import migration001 from './001_create_users.js';
import migration002 from './002_create_notes.js';
import migration003 from './003_create_image_assets.js';
import migration004 from './004_create_publish_records.js';
import migration005 from './005_create_operation_strategies.js';
import migration006 from './006_create_strategy_nodes.js';
import migration007 from './007_create_engagement_data.js';
import migration008 from './008_create_competitor_reports.js';

/**
 * All migrations in execution order.
 */
export const migrations: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
  migration008,
];

/**
 * Run all migrations (up).
 * Returns the combined SQL for all migrations.
 */
export function getAllUpSQL(): string {
  return migrations.map((m) => m.up).join('\n');
}

/**
 * Revert all migrations (down) in reverse order.
 * Returns the combined SQL for reverting all migrations.
 */
export function getAllDownSQL(): string {
  return [...migrations].reverse().map((m) => m.down).join('\n');
}

export type { Migration } from './types.js';
