/**
 * Repository Index
 *
 * Exports all repository classes and their associated types.
 * Each repository provides in-memory CRUD operations for its entity type.
 */

export { BaseRepository } from './base-repository.js';
export type { HasId } from './base-repository.js';

export { UserRepository } from './user-repository.js';

export { NoteRepository } from './note-repository.js';
export type { NoteWithSoftDelete, NoteFilterOptions } from './note-repository.js';

export { PublishRecordRepository } from './publish-record-repository.js';

export { StrategyRepository } from './strategy-repository.js';
export type { StoredStrategy } from './strategy-repository.js';

export { EngagementRepository } from './engagement-repository.js';
export type { StoredEngagement } from './engagement-repository.js';

export { CompetitorReportRepository } from './competitor-report-repository.js';
export type { StoredCompetitorReport } from './competitor-report-repository.js';
