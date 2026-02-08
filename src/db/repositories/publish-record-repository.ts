/**
 * Publish Record Repository
 *
 * In-memory repository for PublishRecord entities.
 * Provides CRUD operations plus lookup by noteId.
 */

import type { PublishRecord } from '../../types/index.js';
import { BaseRepository } from './base-repository.js';

export class PublishRecordRepository extends BaseRepository<PublishRecord> {
  /**
   * Find all publish records for a given note ID.
   */
  findByNoteId(noteId: string): PublishRecord[] {
    return Array.from(this.store.values())
      .filter((record) => record.noteId === noteId)
      .map((record) => ({ ...record }));
  }
}
