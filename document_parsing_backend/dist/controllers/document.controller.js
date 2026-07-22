"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentController = void 0;
const document_service_1 = require("../services/document.service");
const queue_service_1 = require("../queue/queue.service");
const queue_constants_1 = require("../queue/queue.constants");
const document_repository_1 = require("../repositories/document.repository");
const documentType_1 = require("../types/documentType");
const errors_1 = require("../utils/errors");
const Document_1 = require("../models/Document");
const embedding_queue_1 = require("../embedding/queue/embedding.queue");
const metrics_1 = require("../embedding/utils/metrics");
const embedding_types_1 = require("../embedding/models/embedding.types");
const documentChunk_1 = require("../chunking/models/documentChunk");
const vector_queue_1 = require("../vector/queue/vector.queue");
const vectorSync_service_1 = require("../vector/services/vectorSync.service");
const vector_types_1 = require("../vector/models/vector.types");
const metrics_2 = require("../vector/utils/metrics");
class DocumentController {
    documentService;
    documentRepository;
    queueService;
    constructor(documentService = new document_service_1.DocumentService(), documentRepository = new document_repository_1.DocumentRepository(), queueService = queue_service_1.QueueService.getInstance()) {
        this.documentService = documentService;
        this.documentRepository = documentRepository;
        this.queueService = queueService;
    }
    /**
     * POST /documents/upload
     * Handles document uploads, persists metadata, queues background processing, and returns 202.
     */
    uploadDocument = async (req, res, next) => {
        try {
            const savedDoc = await this.documentService.handleUploadedFile(req.file);
            const documentType = (0, documentType_1.getDocumentTypeFromExtension)(savedDoc.extension);
            const priority = req.body.priority || 'NORMAL';
            await this.queueService.addJob(queue_constants_1.JOB_TYPES.DOCUMENT_PROCESS_JOB, {
                documentId: savedDoc.documentId,
                documentType,
                storagePath: savedDoc.filePath,
                requestedBy: req.body.requestedBy || 'system',
                processingVersion: savedDoc.processingVersion || 1,
                priority,
                retryCount: 0,
            }, priority);
            res.status(202).json({
                documentId: savedDoc.documentId,
                status: 'QUEUED',
                message: 'Document uploaded and queued for background processing.',
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * POST /documents/:id/process
     * Queues background processing for an existing uploaded document.
     */
    processDocument = async (req, res, next) => {
        try {
            const { id } = req.params;
            const doc = await this.documentRepository.findByDocumentId(id || '');
            if (!doc) {
                throw new errors_1.NotFoundError(`Document with ID ${id} not found.`);
            }
            const documentType = (0, documentType_1.getDocumentTypeFromExtension)(doc.extension);
            const priority = req.body.priority || 'NORMAL';
            await this.queueService.addJob(queue_constants_1.JOB_TYPES.DOCUMENT_PROCESS_JOB, {
                documentId: doc.documentId,
                documentType,
                storagePath: doc.filePath,
                requestedBy: req.body.requestedBy || 'system',
                processingVersion: doc.processingVersion || 1,
                priority,
                retryCount: 0,
            }, priority);
            res.status(202).json({
                documentId: id,
                status: 'QUEUED',
                message: 'Processing queued successfully.',
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * POST /documents/:id/reprocess
     * Reprocesses a document, incrementing processing version.
     */
    reprocessDocument = async (req, res, next) => {
        try {
            const { id } = req.params;
            const doc = await this.documentRepository.findByDocumentId(id || '');
            if (!doc) {
                throw new errors_1.NotFoundError(`Document with ID ${id} not found.`);
            }
            const nextVersion = (doc.processingVersion || 1) + 1;
            await this.documentRepository.update({ documentId: id || '' }, { processingVersion: nextVersion });
            const documentType = (0, documentType_1.getDocumentTypeFromExtension)(doc.extension);
            const priority = req.body.priority || 'NORMAL';
            await this.queueService.addJob(queue_constants_1.JOB_TYPES.DOCUMENT_REPROCESS_JOB, {
                documentId: doc.documentId,
                documentType,
                storagePath: doc.filePath,
                requestedBy: req.body.requestedBy || 'system',
                processingVersion: nextVersion,
                priority,
                retryCount: 0,
            }, priority);
            res.status(202).json({
                documentId: id,
                status: 'QUEUED',
                message: `Reprocessing queued successfully for version v${nextVersion}.`,
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * DELETE /documents/:id/job
     * Cancels a queued or active document processing job.
     */
    cancelJob = async (req, res, next) => {
        try {
            const { id } = req.params;
            const cancelled = await this.queueService.cancelJob(id || '');
            res.status(200).json({
                documentId: id,
                cancelled,
                message: 'Cancellation signal dispatched successfully.',
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * GET /documents/:id/status
     * Retrieves the current processing status.
     */
    getStatus = async (req, res, next) => {
        try {
            const { id } = req.params;
            const doc = await this.documentRepository.findByDocumentId(id || '');
            if (!doc) {
                throw new errors_1.NotFoundError(`Document with ID ${id} not found.`);
            }
            res.status(200).json({
                documentId: id,
                status: doc.status,
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * GET /documents/:id/progress
     * Retrieves the processing progress percent.
     */
    getProgress = async (req, res, next) => {
        try {
            const { id } = req.params;
            const doc = await this.documentRepository.findByDocumentId(id || '');
            if (!doc) {
                throw new errors_1.NotFoundError(`Document with ID ${id} not found.`);
            }
            res.status(200).json({
                documentId: id,
                progress: doc.progress || 0,
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * GET /queue/stats
     * Retrieves queue statistic counts.
     */
    getQueueStats = async (_req, res, next) => {
        try {
            const stats = await this.queueService.getQueueStats();
            res.status(200).json(stats);
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * POST /documents/:id/embed
     * Queues embedding generation for a chunked document.
     */
    embedDocument = async (req, res, next) => {
        try {
            const docId = (req.params.id || '');
            const doc = await this.documentRepository.findByDocumentId(docId);
            if (!doc) {
                throw new errors_1.NotFoundError(`Document with ID ${docId} not found.`);
            }
            const chunkCount = await documentChunk_1.ChunkModel.countDocuments({ documentId: docId });
            if (chunkCount === 0) {
                res.status(400).json({
                    documentId: docId,
                    message: 'Cannot generate embeddings for a document with no chunks. Parse and chunk it first.',
                });
                return;
            }
            const priority = req.body.priority || 'NORMAL';
            await this.documentRepository.updateStatus(docId, Document_1.DocumentStatus.EMBEDDING_PENDING);
            const embeddingQueue = embedding_queue_1.EmbeddingQueue.getInstance();
            await embeddingQueue.addJob({
                documentId: docId,
                processingVersion: doc.processingVersion || 1,
                priority,
            });
            res.status(202).json({
                documentId: docId,
                status: 'QUEUED',
                message: 'Embedding generation queued successfully.',
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * POST /documents/:id/reembed
     * Resets and re-queues embedding generation for a document.
     */
    reembedDocument = async (req, res, next) => {
        try {
            const docId = (req.params.id || '');
            const doc = await this.documentRepository.findByDocumentId(docId);
            if (!doc) {
                throw new errors_1.NotFoundError(`Document with ID ${docId} not found.`);
            }
            const chunkCount = await documentChunk_1.ChunkModel.countDocuments({ documentId: docId });
            if (chunkCount === 0) {
                res.status(400).json({
                    documentId: docId,
                    message: 'Cannot re-generate embeddings for a document with no chunks.',
                });
                return;
            }
            await documentChunk_1.ChunkModel.updateMany({ documentId: docId }, {
                $set: {
                    embeddingStatus: embedding_types_1.ChunkEmbeddingStatus.PENDING,
                },
                $unset: {
                    embedding: 1,
                    embeddingModel: 1,
                    embeddingVersion: 1,
                    embeddingCreatedAt: 1,
                    embeddingDimensions: 1,
                },
            });
            const priority = req.body.priority || 'NORMAL';
            await this.documentRepository.updateStatus(docId, Document_1.DocumentStatus.EMBEDDING_PENDING);
            const embeddingQueue = embedding_queue_1.EmbeddingQueue.getInstance();
            await embeddingQueue.addJob({
                documentId: docId,
                processingVersion: doc.processingVersion || 1,
                priority,
            });
            res.status(202).json({
                documentId: docId,
                status: 'QUEUED',
                message: 'Re-embedding generation queued successfully.',
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * GET /documents/:id/embedding-status
     * Retrieves the embedding generation progress and stats.
     */
    getEmbeddingStatus = async (req, res, next) => {
        try {
            const docId = (req.params.id || '');
            const doc = await this.documentRepository.findByDocumentId(docId);
            if (!doc) {
                throw new errors_1.NotFoundError(`Document with ID ${docId} not found.`);
            }
            const totalChunks = await documentChunk_1.ChunkModel.countDocuments({ documentId: docId });
            const completedChunks = await documentChunk_1.ChunkModel.countDocuments({ documentId: docId, embeddingStatus: embedding_types_1.ChunkEmbeddingStatus.COMPLETED });
            const pendingChunks = await documentChunk_1.ChunkModel.countDocuments({ documentId: docId, embeddingStatus: embedding_types_1.ChunkEmbeddingStatus.PENDING });
            const processingChunks = await documentChunk_1.ChunkModel.countDocuments({ documentId: docId, embeddingStatus: embedding_types_1.ChunkEmbeddingStatus.PROCESSING });
            const failedChunks = await documentChunk_1.ChunkModel.countDocuments({ documentId: docId, embeddingStatus: embedding_types_1.ChunkEmbeddingStatus.FAILED });
            const retryingChunks = await documentChunk_1.ChunkModel.countDocuments({ documentId: docId, embeddingStatus: embedding_types_1.ChunkEmbeddingStatus.RETRYING });
            res.status(200).json({
                documentId: docId,
                status: doc.status,
                progress: doc.progress || 0,
                stats: {
                    totalChunks,
                    completedChunks,
                    pendingChunks,
                    processingChunks,
                    failedChunks,
                    retryingChunks,
                },
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * GET /embeddings/stats
     * Retrieves global embedding stats.
     */
    getEmbeddingStats = async (_req, res, next) => {
        try {
            const tracker = metrics_1.EmbeddingMetricsTracker.getInstance();
            const stats = tracker.getStats();
            const embeddingQueue = embedding_queue_1.EmbeddingQueue.getInstance();
            const queueStats = await embeddingQueue.getQueueStats();
            res.status(200).json({
                ...stats,
                queueSize: queueStats.waiting + queueStats.active + queueStats.delayed,
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * POST /documents/:id/index
     * Synchronizes embedded chunks of a document to Qdrant.
     */
    indexDocument = async (req, res, next) => {
        try {
            const docId = (req.params.id || '');
            const doc = await this.documentRepository.findByDocumentId(docId);
            if (!doc) {
                throw new errors_1.NotFoundError(`Document with ID ${docId} not found.`);
            }
            const chunkCount = await documentChunk_1.ChunkModel.countDocuments({ documentId: docId });
            if (chunkCount === 0) {
                res.status(400).json({
                    documentId: docId,
                    message: 'Cannot index document. Document has no chunks.',
                });
                return;
            }
            const completedEmbeddings = await documentChunk_1.ChunkModel.countDocuments({
                documentId: docId,
                embeddingStatus: embedding_types_1.ChunkEmbeddingStatus.COMPLETED
            });
            if (completedEmbeddings === 0) {
                res.status(400).json({
                    documentId: docId,
                    message: 'Cannot index document. Chunks must be embedded first.',
                });
                return;
            }
            const priority = req.body.priority || 'NORMAL';
            await this.documentRepository.updateStatus(docId, Document_1.DocumentStatus.VECTOR_SYNC_PENDING);
            const vectorQueue = vector_queue_1.VectorQueue.getInstance();
            await vectorQueue.addJob({
                documentId: docId,
                processingVersion: doc.processingVersion || 1,
                priority,
            });
            res.status(202).json({
                documentId: docId,
                status: 'QUEUED',
                message: 'Vector synchronization queued successfully.',
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * POST /documents/:id/reindex
     * Resets and re-queues vector sync.
     */
    reindexDocument = async (req, res, next) => {
        try {
            const docId = (req.params.id || '');
            const doc = await this.documentRepository.findByDocumentId(docId);
            if (!doc) {
                throw new errors_1.NotFoundError(`Document with ID ${docId} not found.`);
            }
            const syncService = new vectorSync_service_1.VectorSyncService();
            await syncService.deleteDocumentVectors(docId);
            const priority = req.body.priority || 'NORMAL';
            await this.documentRepository.updateStatus(docId, Document_1.DocumentStatus.VECTOR_SYNC_PENDING);
            const vectorQueue = vector_queue_1.VectorQueue.getInstance();
            await vectorQueue.addJob({
                documentId: docId,
                processingVersion: doc.processingVersion || 1,
                priority,
            });
            res.status(202).json({
                documentId: docId,
                status: 'QUEUED',
                message: 'Vector synchronization re-queued successfully.',
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * DELETE /documents/:id/index
     * Removes vectors associated with document from Qdrant.
     */
    deleteIndex = async (req, res, next) => {
        try {
            const docId = (req.params.id || '');
            const doc = await this.documentRepository.findByDocumentId(docId);
            if (!doc) {
                throw new errors_1.NotFoundError(`Document with ID ${docId} not found.`);
            }
            const syncService = new vectorSync_service_1.VectorSyncService();
            await syncService.deleteDocumentVectors(docId);
            await this.documentRepository.updateStatus(docId, Document_1.DocumentStatus.EMBEDDING_COMPLETED);
            res.status(200).json({
                documentId: docId,
                message: 'Indexed vectors removed successfully.',
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * GET /documents/:id/index-status
     * Retrieves synchronization status and chunk stats.
     */
    getIndexStatus = async (req, res, next) => {
        try {
            const docId = (req.params.id || '');
            const doc = await this.documentRepository.findByDocumentId(docId);
            if (!doc) {
                throw new errors_1.NotFoundError(`Document with ID ${docId} not found.`);
            }
            const totalChunks = await documentChunk_1.ChunkModel.countDocuments({ documentId: docId });
            const syncedChunks = await documentChunk_1.ChunkModel.countDocuments({ documentId: docId, vectorSyncStatus: vector_types_1.VectorSyncStatus.SYNCED });
            const pendingSyncs = await documentChunk_1.ChunkModel.countDocuments({ documentId: docId, vectorSyncStatus: vector_types_1.VectorSyncStatus.PENDING });
            const syncingChunks = await documentChunk_1.ChunkModel.countDocuments({ documentId: docId, vectorSyncStatus: vector_types_1.VectorSyncStatus.SYNCING });
            const failedSyncs = await documentChunk_1.ChunkModel.countDocuments({ documentId: docId, vectorSyncStatus: vector_types_1.VectorSyncStatus.FAILED });
            const retryingSyncs = await documentChunk_1.ChunkModel.countDocuments({ documentId: docId, vectorSyncStatus: vector_types_1.VectorSyncStatus.RETRYING });
            res.status(200).json({
                documentId: docId,
                status: doc.status,
                progress: doc.progress || 0,
                stats: {
                    totalChunks,
                    syncedChunks,
                    pendingSyncs,
                    syncingChunks,
                    failedSyncs,
                    retryingSyncs,
                },
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * GET /vector/stats
     * Retrieves global vector stats.
     */
    getVectorStats = async (_req, res, next) => {
        try {
            const tracker = metrics_2.VectorMetricsTracker.getInstance();
            const stats = tracker.getStats();
            const vectorQueue = vector_queue_1.VectorQueue.getInstance();
            const queueStats = await vectorQueue.getQueueStats();
            res.status(200).json({
                ...stats,
                queueSize: queueStats.waiting + queueStats.active + queueStats.delayed,
            });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.DocumentController = DocumentController;
