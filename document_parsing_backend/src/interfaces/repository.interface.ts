export interface IRepository<T> {
  find(filter: Record<string, any>): Promise<T[]>;
  findOne(filter: Record<string, any>): Promise<T | null>;
  create(item: Partial<T>): Promise<T>;
  update(filter: Record<string, any>, item: Partial<T>): Promise<T | null>;
  delete(filter: Record<string, any>): Promise<boolean>;
}
