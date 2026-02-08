/**
 * Database Schema Types
 *
 * TypeScript interfaces that map directly to database tables.
 * These represent the persisted form of entities, as opposed to
 * the application-level types in src/types/index.ts.
 *
 * Key differences from application types:
 * - JSON fields are stored as strings in the database
 * - Soft delete support via deletedAt field on Note
 * - Foreign key relationships expressed via ID fields
 * - All timestamps stored in UTC
 */

// ============================================================
// Database Table Interfaces
// ============================================================

/**
 * Users table - stores user account information
 */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  platform_credentials: string; // JSON string
  created_at: Date;
}

/**
 * Notes table - stores content notes with soft delete support
 * Soft delete: when deletedAt is set, the note is considered deleted
 * but can be restored by setting deletedAt back to null
 */
export interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  text_content: string;
  tags: string; // JSON string array
  platform: string;
  status: string;
  platform_preview: string; // JSON string
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null; // Soft delete field
}

/**
 * Image assets table - stores image metadata for notes
 */
export interface ImageAssetRow {
  id: string;
  note_id: string;
  url: string;
  width: number;
  height: number;
  alt_text: string;
}

/**
 * Publish records table - tracks each publish attempt
 * Supports failure retry tracing
 */
export interface PublishRecordRow {
  id: string;
  note_id: string;
  platform: string;
  success: boolean;
  platform_url: string | null;
  error: string | null;
  published_at: Date;
}

/**
 * Operation strategies table - stores generated operation plans
 */
export interface OperationStrategyRow {
  id: string;
  user_id: string;
  category: string;
  goal: string;
  publish_ready: boolean;
  created_at: Date;
}

/**
 * Strategy nodes table - individual nodes within a strategy
 * Links to specific content via note_id
 */
export interface StrategyNodeRow {
  id: string;
  strategy_id: string;
  note_id: string | null;
  scheduled_date: Date;
  topic: string;
  content_type: string;
  status: string;
}

/**
 * Engagement data table - tracks content interaction metrics
 * Stored as time series for trend analysis
 */
export interface EngagementDataRow {
  id: string;
  note_id: string;
  views: number;
  likes: number;
  comments: number;
  favorites: number;
  updated_at: Date;
}

/**
 * Competitor reports table - stores competitor analysis results
 */
export interface CompetitorReportRow {
  id: string;
  user_id: string;
  target: string; // JSON string
  strategy_suggestions: string; // JSON string
  publish_ready: boolean;
  generated_at: Date;
}
