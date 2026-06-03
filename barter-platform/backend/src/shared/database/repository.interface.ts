// src/shared/database/repository.interface.ts

// Generic Repository Interface defining common database operations
export interface IRepository<T> {
  // Create a new entity in database
  create(data: Partial<T>): Promise<T>;

  // Find a single entity by its ID
  findById(id: string): Promise<T | null>;

  // Find a single entity matching a custom filter
  findOne(filter: Partial<T>): Promise<T | null>;

  // Find multiple entities matching a filter
  findMany(filter: Partial<T>): Promise<T[]>;

  // Update an existing entity by ID
  update(id: string, data: Partial<T>): Promise<T | null>;

  // Delete an entity by ID
  delete(id: string): Promise<boolean>;
}

// Optional: Repository interface with pagination support
export interface IPaginatedRepository<T> extends IRepository<T> {
  // Find entities with page and limit parameters
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

// Optional: Repository interface with soft delete support
export interface ISoftDeleteRepository<T> extends IRepository<T> {
  // Mark record as deleted without removing from database
  softDelete(id: string): Promise<T | null>;

  // Restore a soft-deleted record
  restore(id: string): Promise<T | null>;

  // Find all soft-deleted records
  findDeleted(): Promise<T[]>;
}
