/**
 * Competitor Report Repository
 *
 * In-memory repository for CompetitorReport entities.
 * Provides CRUD operations plus lookup by userId.
 */

import type { CompetitorReport } from '../../types/index.js';
import { BaseRepository } from './base-repository.js';

/**
 * Extended CompetitorReport with userId for storage
 */
export interface StoredCompetitorReport extends CompetitorReport {
  userId: string;
}

export class CompetitorReportRepository extends BaseRepository<StoredCompetitorReport> {
  /**
   * Find all competitor reports for a given user ID.
   */
  findByUserId(userId: string): StoredCompetitorReport[] {
    return Array.from(this.store.values())
      .filter((report) => report.userId === userId)
      .map((report) => ({ ...report }));
  }
}
