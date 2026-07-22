"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const document_controller_1 = require("../controllers/document.controller");
const upload_middleware_1 = require("../middlewares/upload.middleware");
const router = (0, express_1.Router)();
const controller = new document_controller_1.DocumentController();
// POST /documents/upload
router.post('/upload', upload_middleware_1.upload.single('file'), controller.uploadDocument);
// POST /documents/:id/process
router.post('/:id/process', controller.processDocument);
// POST /documents/:id/reprocess
router.post('/:id/reprocess', controller.reprocessDocument);
// DELETE /documents/:id/job
router.delete('/:id/job', controller.cancelJob);
// GET /documents/:id/status
router.get('/:id/status', controller.getStatus);
// GET /documents/:id/progress
router.get('/:id/progress', controller.getProgress);
// GET /documents/queue/stats (also exposes queue stats under documents route)
router.get('/queue/stats', controller.getQueueStats);
// POST /documents/:id/embed
router.post('/:id/embed', controller.embedDocument);
// POST /documents/:id/reembed
router.post('/:id/reembed', controller.reembedDocument);
// GET /documents/:id/embedding-status
router.get('/:id/embedding-status', controller.getEmbeddingStatus);
// POST /documents/:id/index
router.post('/:id/index', controller.indexDocument);
// POST /documents/:id/reindex
router.post('/:id/reindex', controller.reindexDocument);
// DELETE /documents/:id/index
router.delete('/:id/index', controller.deleteIndex);
// GET /documents/:id/index-status
router.get('/:id/index-status', controller.getIndexStatus);
exports.default = router;
