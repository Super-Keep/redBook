/**
 * Migration Types
 *
 * Defines the interface for database migration scripts.
 * Each migration exports `up` and `down` functions containing
 * SQL statements for applying and reverting the migration.
 */

/**
 * A database migration with up (apply) and down (revert) SQL statements.
 */
export interface Migration {
  /** Human-readable name of the migration */
  name: string;
  /** SQL statements to apply the migration */
  up: string;
  /** SQL statements to revert the migration */
  down: string;
}
