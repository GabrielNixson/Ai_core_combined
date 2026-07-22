"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const config_1 = require("../config/config");
const errors_1 = require("../utils/errors");
const originalUploadsDir = path_1.default.join(config_1.config.uploadsDir, 'original');
// Ensure upload directory exists recursively on startup
if (!fs_1.default.existsSync(originalUploadsDir)) {
    fs_1.default.mkdirSync(originalUploadsDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, originalUploadsDir);
    },
    filename: (_req, file, cb) => {
        const documentId = (0, uuid_1.v4)();
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        // Save as UUID.pdf
        cb(null, `${documentId}${ext}`);
    },
});
const fileFilter = (_req, file, cb) => {
    // Validate MIME type
    if (file.mimetype !== 'application/pdf') {
        return cb(new errors_1.UnsupportedMediaTypeError('Only PDF files are allowed.'));
    }
    // Double check file extension
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf') {
        return cb(new errors_1.UnsupportedMediaTypeError('Only files with a .pdf extension are allowed.'));
    }
    cb(null, true);
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: config_1.config.maxUploadSize,
    },
});
exports.default = exports.upload;
