/**
 * Strategy Repository
 *
 * In-memory repository for OperationStrategy entities.
 * Provides CRUD operations plus lookup by userId.
 */

import type { OperationStrategy } from '../../types/index.js';
import { BaseRepository } from './base-repository.js';

/**
 * Extended OperationStrategy with userId for storage
 */
export interface StoredStrategy extends OperationStrategy {
  userId: string;
}

export class StrategyRepository extends BaseRepository<StoredStrategy> {
  /**
   * Find all strategies for a given user ID.
   */
  findByUserId(userId: string): StoredStrategy[] {
    return Array.from(this.store.values())
      .filter((strategy) => strategy.userId === userId)
      .map((strategy) => ({ ...strategy }));
  }
}
