"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOB_PRIORITIES = exports.JOB_TYPES = exports.QUEUE_NAME = void 0;
exports.QUEUE_NAME = 'document-processing';
exports.JOB_TYPES = {
    DOCUMENT_PROCESS_JOB: 'DOCUMENT_PROCESS_JOB',
    DOCUMENT_REPROCESS_JOB: 'DOCUMENT_REPROCESS_JOB',
    DOCUMENT_DELETE_JOB: 'DOCUMENT_DELETE_JOB',
    DOCUMENT_EXPORT_JOB: 'DOCUMENT_EXPORT_JOB',
};
exports.JOB_PRIORITIES = {
    URGENT: 1,
    HIGH: 10,
    NORMAL: 20,
    LOW: 30,
};
exports.default = exports.JOB_TYPES;
