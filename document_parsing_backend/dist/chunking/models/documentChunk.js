"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChunkModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const DocumentChunkSchema = new mongoose_1.Schema({
    chunkId: { type: String, required: true, unique: true },
    documentId: { type: String, required: true, index: true },
    chunkIndex: { type: Number, required: true },
    content: { type: String, required: true },
    contentType: { type: String, required: true, index: true },
    title: { type: String, required: true },
    section: { type: String, index: true },
    sectionPath: { type: String },
    pageStart: { type: Number, index: true },
    pageEnd: { type: Number },
    slideNumber: { type: Number },
    metadata: { type: mongoose_1.Schema.Types.Mixed },
    tokenEstimate: { type: Number, required: true, index: true },
    characterCount: { type: Number, required: true },
    embeddingId: { type: String },
    vectorId: { type: String },
    parentChunkId: { type: String },
    previousChunkId: { type: String },
    nextChunkId: { type: String },
    embedding: { type: [Number] },
    embeddingModel: { type: String },
    embeddingVersion: { type: Number },
    embeddingCreatedAt: { type: Date },
    embeddingStatus: { type: String, enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING'], default: 'PENDING', index: true },
    embeddingDimensions: { type: Number },
    vectorSyncStatus: { type: String, enum: ['PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'RETRYING'], default: 'PENDING', index: true },
    vectorSyncedAt: { type: Date },
    vectorSyncError: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
});
// Configure compound lookup indexes
DocumentChunkSchema.index({ documentId: 1, chunkIndex: 1 });
exports.ChunkModel = mongoose_1.default.model('DocumentChunk', DocumentChunkSchema);
exports.default = exports.ChunkModel;
