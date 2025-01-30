import { Model, FilterQuery } from 'mongoose';

export class BaseRepository<T> {
  constructor(private readonly model: Model<T>) {}

  async save(data: Partial<T>): Promise<T> {
    const createdItem = new this.model(data);
    return await createdItem.save() as unknown as T;
  }

  async findAll(): Promise<T[]> {
    return await this.model.find().exec();
  }

  async findById(id: BinaryType): Promise<T | null> {
    return await this.model.findById(id).exec();
  }

  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return await this.model.findOne(filter).exec();
  }

  async update(id: BinaryType, updateData: Partial<T>): Promise<T | null> {
    return await this.model.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: BinaryType): Promise<T | null> {
    return await this.model.findByIdAndDelete(id).exec();
  }
}
