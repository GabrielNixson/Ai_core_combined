import multer from 'multer';
import multerS3 from 'multer-s3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/config';
import { UnsupportedMediaTypeError } from '../utils/errors';
import { MinioService } from '../utils/minio';
import { getDocumentTypeFromExtension } from '../types/documentType';

let storage: multer.StorageEngine;

if (config.storageProvider === 'minio') {
  const minio = MinioService.getInstance();
  storage = multerS3({
    s3: minio.getS3Client(),
    bucket: config.minioBucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req, file, cb) => {
      const documentId = uuidv4();
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `original/${documentId}${ext}`);
    },
  });
} else {
  const originalUploadsDir = path.join(config.uploadsDir, 'original');

  // Ensure upload directory exists recursively on startup if local filesystem is used
  if (!fs.existsSync(originalUploadsDir)) {
    fs.mkdirSync(originalUploadsDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, originalUploadsDir);
    },
    filename: (_req, file, cb) => {
      const documentId = uuidv4();
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${documentId}${ext}`);
    },
  });
}

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    const ext = path.extname(file.originalname).toLowerCase();
    getDocumentTypeFromExtension(ext);
    cb(null, true);
  } catch (error: any) {
    cb(new UnsupportedMediaTypeError(error.message));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxUploadSize,
  },
});

export default upload;
