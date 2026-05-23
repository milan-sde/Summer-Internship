// src/shared/database/repository.interface.ts

/**
 * Generic Repository Interface
 *
 * WHY we need this:
 * - Defines a contract that ALL repositories must follow
 * - Makes switching databases easier (MongoDB → PostgreSQL)
 * - Enables consistent CRUD operations across all modules
 * - Makes mocking for unit tests trivial
 *
 * WHAT problem it solves:
 * - Without this, every repository would implement methods differently
 * - Some might use 'get', others 'find', others 'retrieve'
 * - This standardization makes the codebase predictable
 *
 * WHEN to use:
 * - Every repository you create should implement this interface
 * - Use the generic <T> to specify your entity type (User, Profile, etc.)
 *
 * HOW it works:
 * - T is your entity type (like IUser or IProfile)
 * - Each method returns either the entity, array, or boolean
 * - Consistent naming across all data access layers
 */

/**
 * Generic Repository Interface
 * @template T - The entity type (User, Profile, Collaboration, etc.)
 */
export interface IRepository<T> {
  /**
   * Create a new entity
   * @param data - Partial entity data (id is auto-generated)
   * @returns The created entity
   */
  create(data: Partial<T>): Promise<T>;

  /**
   * Find entity by ID
   * @param id - MongoDB ObjectId or UUID
   * @returns Entity or null if not found
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find ONE entity matching filter
   * @param filter - Partial entity fields to match
   * @returns Entity or null if not found
   */
  findOne(filter: Partial<T>): Promise<T | null>;

  /**
   * Find MULTIPLE entities matching filter
   * @param filter - Partial entity fields to match
   * @returns Array of entities (empty array if none)
   */
  findMany(filter: Partial<T>): Promise<T[]>;

  /**
   * Update entity by ID
   * @param id - Entity ID
   * @param data - Partial data to update
   * @returns Updated entity
   * @throws NotFoundError if entity doesn't exist
   */
  update(id: string, data: Partial<T>): Promise<T | null>;

  /**
   * Delete entity by ID
   * @param id - Entity ID
   * @returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>;
}

/**
 * Optional: Extended repository interface with pagination
 * For collections that need pagination support
 */
export interface IPaginatedRepository<T> extends IRepository<T> {
  /**
   * Find entities with pagination
   * @param filter - Partial entity fields to match
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @returns Paginated result with metadata
   */
  findPaginated(
    filter: Partial<T>,
    page: number,
    limit: number,
  ): Promise<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }>;
}

/**
 * Optional: Soft delete repository interface
 * For entities that need to be recoverable after deletion
 */
export interface ISoftDeleteRepository<T> extends IRepository<T> {
  /**
   * Soft delete (mark as deleted without removing from DB)
   * @param id - Entity ID
   * @returns Updated entity with deletedAt timestamp
   */
  softDelete(id: string): Promise<T | null>;

  /**
   * Restore soft-deleted entity
   * @param id - Entity ID
   * @returns Restored entity
   */
  restore(id: string): Promise<T | null>;

  /**
   * Find soft-deleted entities
   * @returns Array of deleted entities
   */
  findDeleted(): Promise<T[]>;
}

/**
 * Example Usage:
 *
 * // In your user.repository.ts
 * import { IRepository } from '@shared/database/repository.interface';
 * import { IUser } from '../models/user.model';
 *
 * export class UserRepository implements IRepository<IUser> {
 *   async create(data: Partial<IUser>): Promise<IUser> {
 *     const user = new User(data);
 *     return user.save();
 *   }
 *
 *   async findById(id: string): Promise<IUser | null> {
 *     return User.findById(id);
 *   }
 *
 *   // ... implement all required methods
 * }
 */
