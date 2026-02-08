/**
 * Engagement Repository
 *
 * In-memory repository for EngagementData entities.
 * Provides CRUD operations plus lookup by noteId.
 */

import type { EngagementData } from '../../types/index.js';
import { BaseRepository } from './base-repository.js';

/**
 * Extended EngagementData with id for storage
 */
export interface StoredEngagement extends EngagementData {
  id: string;
}

export class EngagementRepository extends BaseRepository<StoredEngagement> {
  /**
   * Find all engagement data records for a given note ID.
   */
  findByNoteId(noteId: string): StoredEngagement[] {
    return Array.from(this.store.values())
      .filter((data) => data.noteId === noteId)
      .map((data) => ({ ...data }));
  }
}
