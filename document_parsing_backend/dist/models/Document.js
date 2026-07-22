"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentModel = exports.DocumentStatus = void 0;
const mongoose_1 = require("mongoose");
var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus["UPLOADED"] = "UPLOADED";
    DocumentStatus["QUEUED"] = "QUEUED";
    DocumentStatus["PROCESSING"] = "PROCESSING";
    DocumentStatus["PARSING"] = "PARSING";
    DocumentStatus["PARSED"] = "PARSED";
    DocumentStatus["EXPORTING"] = "EXPORTING";
    DocumentStatus["CHUNKING"] = "CHUNKING";
    DocumentStatus["CHUNKED"] = "CHUNKED";
    DocumentStatus["EMBEDDING_PENDING"] = "EMBEDDING_PENDING";
    DocumentStatus["EMBEDDING_IN_PROGRESS"] = "EMBEDDING_IN_PROGRESS";
    DocumentStatus["EMBEDDING_COMPLETED"] = "EMBEDDING_COMPLETED";
    DocumentStatus["EMBEDDED"] = "EMBEDDED";
    DocumentStatus["VECTOR_SYNC_PENDING"] = "VECTOR_SYNC_PENDING";
    DocumentStatus["VECTOR_SYNCING"] = "VECTOR_SYNCING";
    DocumentStatus["INDEXED"] = "INDEXED";
    DocumentStatus["COMPLETED"] = "COMPLETED";
    DocumentStatus["FAILED"] = "FAILED";
    DocumentStatus["CANCELLED"] = "CANCELLED";
})(DocumentStatus || (exports.DocumentStatus = DocumentStatus = {}));
const DocumentSchema = new mongoose_1.Schema({
    documentId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    originalName: {
        type: String,
        required: true,
    },
    storedName: {
        type: String,
        required: true,
    },
    filePath: {
        type: String,
        required: true,
    },
    mimeType: {
        type: String,
        required: true,
    },
    extension: {
        type: String,
        required: true,
    },
    size: {
        type: Number,
        required: true,
    },
    uploadedAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
    status: {
        type: String,
        enum: Object.values(DocumentStatus),
        required: true,
        default: DocumentStatus.UPLOADED,
    },
    metadata: {
        type: mongoose_1.Schema.Types.Mixed,
        default: {},
    },
    parsedContent: {
        type: mongoose_1.Schema.Types.Mixed,
    },
    markdownPath: {
        type: String,
    },
    jsonPath: {
        type: String,
    },
    chunksCount: {
        type: Number,
        default: 0,
    },
    errorDetails: {
        type: String,
    },
    progress: {
        type: Number,
        default: 0,
    },
    documentName: {
        type: String,
    },
    documentType: {
        type: String,
        index: true,
    },
    originalFileName: {
        type: String,
    },
    storagePath: {
        type: String,
    },
    processingTime: {
        type: Number,
    },
    processingVersion: {
        type: Number,
        default: 1,
    },
    isDeleted: {
        type: Boolean,
        default: false,
        index: true,
    },
    deletedAt: {
        type: Date,
    },
    deletedBy: {
        type: String,
    },
}, {
    timestamps: true, // Auto-manage createdAt / updatedAt
    minimize: false, // Do not strip empty subdocuments
});
// Indexes
DocumentSchema.index({ status: 1 });
DocumentSchema.index({ createdAt: 1 });
exports.DocumentModel = (0, mongoose_1.model)('Document', DocumentSchema);
exports.default = exports.DocumentModel;
