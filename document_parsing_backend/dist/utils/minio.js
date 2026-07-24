"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinioService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const config_1 = require("../config/config");
const logger_1 = require("./logger");
class MinioService {
    static instance;
    client;
    bucketName;
    isInitialized = false;
    constructor() {
        this.bucketName = config_1.config.minioBucket;
        logger_1.logger.info(`[MinIO Service] Initializing with endpoint: ${config_1.config.minioEndpoint}, bucket: ${this.bucketName}`);
        this.client = new client_s3_1.S3Client({
            endpoint: config_1.config.minioEndpoint,
            region: 'us-east-1', // Default region placeholder
            credentials: {
                accessKeyId: config_1.config.minioAccessKey,
                secretAccessKey: config_1.config.minioSecretKey,
            },
            forcePathStyle: true, // Crucial for MinIO path resolving
        });
    }
    static getInstance() {
        if (!MinioService.instance) {
            MinioService.instance = new MinioService();
        }
        return MinioService.instance;
    }
    /**
     * Assures the bucket exists, creating it if missing.
     */
    async ensureBucketExists() {
        if (this.isInitialized)
            return;
        try {
            logger_1.logger.debug(`[MinIO Service] Checking if bucket "${this.bucketName}" exists...`);
            await this.client.send(new client_s3_1.HeadBucketCommand({ Bucket: this.bucketName }));
            this.isInitialized = true;
            logger_1.logger.info(`[MinIO Service] Bucket "${this.bucketName}" verified.`);
        }
        catch (err) {
            // If bucket doesn't exist, HeadBucket throws a 404/NotFound error
            if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
                logger_1.logger.warn(`[MinIO Service] Bucket "${this.bucketName}" not found. Creating bucket...`);
                try {
                    await this.client.send(new client_s3_1.CreateBucketCommand({ Bucket: this.bucketName }));
                    this.isInitialized = true;
                    logger_1.logger.info(`[MinIO Service] Bucket "${this.bucketName}" successfully created.`);
                }
                catch (createErr) {
                    logger_1.logger.error(`[MinIO Service] Failed to create bucket:`, createErr);
                    throw createErr;
                }
            }
            else {
                logger_1.logger.error(`[MinIO Service] HeadBucket query failed:`, err);
                throw err;
            }
        }
    }
    /**
     * Uploads a file buffer directly to MinIO.
     */
    async uploadBuffer(key, buffer, contentType) {
        await this.ensureBucketExists();
        const cleanKey = this.normalizeKey(key);
        try {
            logger_1.logger.debug(`[MinIO Service] Uploading buffer to key: ${cleanKey} (${buffer.length} bytes)`);
            await this.client.send(new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: cleanKey,
                Body: buffer,
                ContentType: contentType || 'application/octet-stream',
            }));
            return cleanKey;
        }
        catch (error) {
            logger_1.logger.error(`[MinIO Service] Upload buffer failed for key ${cleanKey}:`, error);
            throw error;
        }
    }
    /**
     * Uploads text content directly to MinIO.
     */
    async uploadText(key, text, contentType) {
        const buffer = Buffer.from(text, 'utf-8');
        return this.uploadBuffer(key, buffer, contentType || 'text/plain; charset=utf-8');
    }
    /**
     * Fetches an object from MinIO and returns it as a Buffer.
     */
    async getObjectBuffer(key) {
        await this.ensureBucketExists();
        const cleanKey = this.normalizeKey(key);
        try {
            logger_1.logger.debug(`[MinIO Service] Downloading key: ${cleanKey}`);
            const response = await this.client.send(new client_s3_1.GetObjectCommand({
                Bucket: this.bucketName,
                Key: cleanKey,
            }));
            if (!response.Body) {
                throw new Error(`Empty body returned for key: ${cleanKey}`);
            }
            return await this.streamToBuffer(response.Body);
        }
        catch (error) {
            logger_1.logger.error(`[MinIO Service] Download failed for key ${cleanKey}:`, error);
            throw error;
        }
    }
    /**
     * Deletes an object from MinIO.
     */
    async deleteObject(key) {
        await this.ensureBucketExists();
        const cleanKey = this.normalizeKey(key);
        try {
            logger_1.logger.info(`[MinIO Service] Deleting key: ${cleanKey}`);
            await this.client.send(new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: cleanKey,
            }));
        }
        catch (error) {
            logger_1.logger.error(`[MinIO Service] Delete failed for key ${cleanKey}:`, error);
            throw error;
        }
    }
    /**
     * Helper to convert response stream to buffer.
     */
    async streamToBuffer(stream) {
        return new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }
    /**
     * Sanitizes local paths or keys so they are relative keys inside MinIO.
     */
    normalizeKey(key) {
        // If the key is an absolute path or has config.uploadsDir prefix, strip it
        let clean = key.replace(/\\/g, '/');
        const prefixPattern = new RegExp(`^.*?${config_1.config.uploadsDir}/`, 'i');
        clean = clean.replace(prefixPattern, '');
        // Strip leading slashes
        return clean.replace(/^\/+/, '');
    }
    // Getter for the S3 client (used in multer-s3)
    getS3Client() {
        return this.client;
    }
}
exports.MinioService = MinioService;
exports.default = MinioService;
