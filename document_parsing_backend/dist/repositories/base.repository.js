"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseRepository = void 0;
class BaseRepository {
    model;
    constructor(model) {
        this.model = model;
    }
    async find(filter, session) {
        const docs = await this.model.find(filter).session(session || null).lean().exec();
        return docs;
    }
    async findOne(filter, session) {
        const doc = await this.model.findOne(filter).session(session || null).lean().exec();
        return doc;
    }
    async create(item, session) {
        const created = new this.model(item);
        await created.save({ session });
        return created.toObject();
    }
    async update(filter, item, session) {
        const updated = await this.model
            .findOneAndUpdate(filter, { $set: item }, { new: true, session })
            .lean()
            .exec();
        return updated;
    }
    async delete(filter, session) {
        const result = await this.model.deleteOne(filter, { session }).exec();
        return (result.deletedCount ?? 0) > 0;
    }
}
exports.BaseRepository = BaseRepository;
