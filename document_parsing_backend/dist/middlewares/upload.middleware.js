"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const multer_s3_1 = __importDefault(require("multer-s3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const config_1 = require("../config/config");
const errors_1 = require("../utils/errors");
const minio_1 = require("../utils/minio");
const documentType_1 = require("../types/documentType");
let storage;
if (config_1.config.storageProvider === 'minio') {
    const minio = minio_1.MinioService.getInstance();
    storage = (0, multer_s3_1.default)({
        s3: minio.getS3Client(),
        bucket: config_1.config.minioBucket,
        contentType: multer_s3_1.default.AUTO_CONTENT_TYPE,
        key: (_req, file, cb) => {
            const documentId = (0, uuid_1.v4)();
            const ext = path_1.default.extname(file.originalname).toLowerCase();
            cb(null, `original/${documentId}${ext}`);
        },
    });
}
else {
    const originalUploadsDir = path_1.default.join(config_1.config.uploadsDir, 'original');
    // Ensure upload directory exists recursively on startup if local filesystem is used
    if (!fs_1.default.existsSync(originalUploadsDir)) {
        fs_1.default.mkdirSync(originalUploadsDir, { recursive: true });
    }
    storage = multer_1.default.diskStorage({
        destination: (_req, _file, cb) => {
            cb(null, originalUploadsDir);
        },
        filename: (_req, file, cb) => {
            const documentId = (0, uuid_1.v4)();
            const ext = path_1.default.extname(file.originalname).toLowerCase();
            cb(null, `${documentId}${ext}`);
        },
    });
}
const fileFilter = (_req, file, cb) => {
    try {
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        (0, documentType_1.getDocumentTypeFromExtension)(ext);
        cb(null, true);
    }
    catch (error) {
        cb(new errors_1.UnsupportedMediaTypeError(error.message));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: config_1.config.maxUploadSize,
    },
});
exports.default = exports.upload;
