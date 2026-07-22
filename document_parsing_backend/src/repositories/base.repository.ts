import { Model } from 'mongoose';
import { IRepository } from '../interfaces/repository.interface';

export abstract class BaseRepository<T extends object, D> implements IRepository<T> {
  protected model: Model<D>;

  constructor(model: Model<D>) {
    this.model = model;
  }

  public async find(filter: Record<string, any>, session?: any): Promise<T[]> {
    const docs = await this.model.find(filter).session(session || null).lean().exec();
    return docs as unknown as T[];
  }

  public async findOne(filter: Record<string, any>, session?: any): Promise<T | null> {
    const doc = await this.model.findOne(filter).session(session || null).lean().exec();
    return doc as unknown as T | null;
  }

  public async create(item: Partial<T>, session?: any): Promise<T> {
    const created = new this.model(item);
    await created.save({ session });
    return created.toObject() as unknown as T;
  }

  public async update(filter: Record<string, any>, item: Partial<T>, session?: any): Promise<T | null> {
    const updated = await this.model
      .findOneAndUpdate(filter, { $set: item } as any, { new: true, session })
      .lean()
      .exec();
    return updated as unknown as T | null;
  }

  public async delete(filter: Record<string, any>, session?: any): Promise<boolean> {
    const result = await this.model.deleteOne(filter, { session }).exec();
    return (result.deletedCount ?? 0) > 0;
  }
}
