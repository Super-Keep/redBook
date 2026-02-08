/**
 * User Repository
 *
 * In-memory repository for User entities.
 * Provides basic CRUD operations plus email lookup.
 */

import type { User } from '../../types/index.js';
import { BaseRepository } from './base-repository.js';

export class UserRepository extends BaseRepository<User> {
  /**
   * Find a user by email
   */
  findByEmail(email: string): User | undefined {
    for (const user of this.store.values()) {
      if (user.email === email) {
        return { ...user };
      }
    }
    return undefined;
  }
}
