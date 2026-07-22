"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentRepository = void 0;
const base_repository_1 = require("./base.repository");
const Document_1 = require("../models/Document");
const config_1 = require("../config/config");
class DocumentRepository extends base_repository_1.BaseRepository {
    constructor() {
        super(Document_1.DocumentModel);
    }
    /**
     * Overrides find to filter out soft-deleted documents and attach the session context.
     */
    async find(filter, session) {
        const finalFilter = config_1.config.enableSoftDelete
            ? { ...filter, isDeleted: { $ne: true } }
            : filter;
        return super.find(finalFilter, session);
    }
    /**
     * Overrides findOne to filter out soft-deleted documents and attach the session context.
     */
    async findOne(filter, session) {
        const finalFilter = config_1.config.enableSoftDelete
            ? { ...filter, isDeleted: { $ne: true } }
            : filter;
        return super.findOne(finalFilter, session);
    }
    /**
     * Overrides create to configure initial versioning, soft-delete, and attach the session context.
     */
    async create(item, session) {
        const defaultData = {
            isDeleted: false,
            processingVersion: item.processingVersion ?? 1,
            ...item,
        };
        return super.create(defaultData, session);
    }
    /**
     * Overrides delete to perform soft deletes using the session context if enabled.
     */
    async delete(filter, session) {
        if (config_1.config.enableSoftDelete) {
            const result = await this.model
                .updateMany(filter, {
                $set: {
                    isDeleted: true,
                    deletedAt: new Date(),
                    deletedBy: 'system',
                },
            }, { session })
                .exec();
            return (result.modifiedCount ?? 0) > 0;
        }
        else {
            return super.delete(filter, session);
        }
    }
    async findByDocumentId(documentId, session) {
        return this.findOne({ documentId }, session);
    }
    async findByDocumentType(documentType, session) {
        return this.find({ documentType }, session);
    }
    async findByStatus(status, session) {
        return this.find({ status }, session);
    }
    async updateStatus(documentId, status, extra = {}, session) {
        return this.update({ documentId }, { status, ...extra }, session);
    }
    async exists(documentId, session) {
        const doc = await this.findOne({ documentId }, session);
        return doc !== null;
    }
}
exports.DocumentRepository = DocumentRepository;
exports.default = DocumentRepository;
