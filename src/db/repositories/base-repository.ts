/**
 * Base Repository
 *
 * Provides a generic in-memory repository implementation with standard CRUD operations.
 * All entity-specific repositories extend this base class.
 *
 * Uses an in-memory Map as the data store for MVP purposes.
 * In production, this would be replaced with actual database queries.
 */

export interface HasId {
  id: string;
}

export class BaseRepository<T extends HasId> {
  protected store: Map<string, T> = new Map();

  /**
   * Create a new entity
   */
  create(entity: T): T {
    if (this.store.has(entity.id)) {
      throw new Error(`Entity with id '${entity.id}' already exists`);
    }
    this.store.set(entity.id, { ...entity });
    return { ...entity };
  }

  /**
   * Find an entity by ID
   */
  findById(id: string): T | undefined {
    const entity = this.store.get(id);
    return entity ? { ...entity } : undefined;
  }

  /**
   * Find all entities
   */
  findAll(): T[] {
    return Array.from(this.store.values()).map((e) => ({ ...e }));
  }

  /**
   * Update an entity by ID
   */
  update(id: string, updates: Partial<T>): T | undefined {
    const existing = this.store.get(id);
    if (!existing) {
      return undefined;
    }
    const updated = { ...existing, ...updates, id } as T;
    this.store.set(id, updated);
    return { ...updated };
  }

  /**
   * Delete an entity by ID (hard delete)
   */
  delete(id: string): boolean {
    return this.store.delete(id);
  }

  /**
   * Count all entities
   */
  count(): number {
    return this.store.size;
  }

  /**
   * Clear all entities (useful for testing)
   */
  clear(): void {
    this.store.clear();
  }
}
