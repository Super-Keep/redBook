/**
 * Note Repository
 *
 * In-memory repository for Note entities with soft delete support.
 *
 * Key features:
 * - Soft delete: sets deletedAt instead of removing the record
 * - Restore: clears deletedAt to bring back a soft-deleted note
 * - Filtering: supports filtering by platform, category (via tags), status, and time range
 * - findAll excludes soft-deleted notes by default
 * - findDeleted returns only soft-deleted notes
 *
 * Requirements: 7.2, 7.4, 7.5
 */

import type { Note, Platform, NoteStatus } from '../../types/index.js';
import { BaseRepository } from './base-repository.js';

/**
 * Extended Note type with soft delete support
 */
export interface NoteWithSoftDelete extends Note {
  userId: string;
  deletedAt: Date | null;
}

/**
 * Filter options for querying notes
 */
export interface NoteFilterOptions {
  platform?: Platform;
  category?: string;
  status?: NoteStatus;
  startDate?: Date;
  endDate?: Date;
  userId?: string;
}

export class NoteRepository extends BaseRepository<NoteWithSoftDelete> {
  /**
   * Find all active (non-deleted) notes.
   * Overrides base findAll to exclude soft-deleted notes.
   */
  override findAll(): NoteWithSoftDelete[] {
    return Array.from(this.store.values())
      .filter((note) => note.deletedAt === null)
      .map((note) => ({ ...note }));
  }

  /**
   * Find an active (non-deleted) note by ID.
   * Returns undefined if the note is soft-deleted.
   */
  override findById(id: string): NoteWithSoftDelete | undefined {
    const note = this.store.get(id);
    if (!note || note.deletedAt !== null) {
      return undefined;
    }
    return { ...note };
  }

  /**
   * Find a note by ID regardless of soft-delete status.
   * Useful for restore operations.
   */
  findByIdIncludingDeleted(id: string): NoteWithSoftDelete | undefined {
    const note = this.store.get(id);
    return note ? { ...note } : undefined;
  }

  /**
   * Soft delete a note by setting deletedAt to current timestamp.
   * Returns true if the note was found and soft-deleted, false otherwise.
   */
  softDelete(id: string): boolean {
    const note = this.store.get(id);
    if (!note || note.deletedAt !== null) {
      return false;
    }
    note.deletedAt = new Date();
    return true;
  }

  /**
   * Restore a soft-deleted note by clearing deletedAt.
   * Returns the restored note, or undefined if not found or not deleted.
   */
  restore(id: string): NoteWithSoftDelete | undefined {
    const note = this.store.get(id);
    if (!note || note.deletedAt === null) {
      return undefined;
    }
    note.deletedAt = null;
    return { ...note };
  }

  /**
   * Find all soft-deleted notes.
   */
  findDeleted(): NoteWithSoftDelete[] {
    return Array.from(this.store.values())
      .filter((note) => note.deletedAt !== null)
      .map((note) => ({ ...note }));
  }

  /**
   * Filter notes by various criteria.
   * Only returns active (non-deleted) notes.
   *
   * Supports filtering by:
   * - platform: exact match on note platform
   * - category: matches if any tag contains the category string
   * - status: exact match on note status
   * - startDate/endDate: note createdAt falls within the time range
   * - userId: exact match on note userId
   *
   * Requirements: 7.4
   */
  filter(options: NoteFilterOptions): NoteWithSoftDelete[] {
    let results = this.findAll();

    if (options.platform) {
      results = results.filter((note) => note.platform === options.platform);
    }

    if (options.category) {
      const category = options.category.toLowerCase();
      results = results.filter((note) =>
        note.tags.some((tag) => tag.toLowerCase().includes(category))
      );
    }

    if (options.status) {
      results = results.filter((note) => note.status === options.status);
    }

    if (options.startDate) {
      const start = options.startDate;
      results = results.filter((note) => note.createdAt >= start);
    }

    if (options.endDate) {
      const end = options.endDate;
      results = results.filter((note) => note.createdAt <= end);
    }

    if (options.userId) {
      results = results.filter((note) => note.userId === options.userId);
    }

    return results;
  }

  /**
   * Find all notes by user ID (active only).
   */
  findByUserId(userId: string): NoteWithSoftDelete[] {
    return this.findAll().filter((note) => note.userId === userId);
  }
}
