import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  CreateBucketCommand, 
  HeadBucketCommand 
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { config } from '../config/config';
import { logger } from './logger';

export class MinioService {
  private static instance: MinioService;
  private client: S3Client;
  private bucketName: string;
  private isInitialized = false;

  private constructor() {
    this.bucketName = config.minioBucket;
    
    logger.info(`[MinIO Service] Initializing with endpoint: ${config.minioEndpoint}, bucket: ${this.bucketName}`);
    
    this.client = new S3Client({
      endpoint: config.minioEndpoint,
      region: 'us-east-1', // Default region placeholder
      credentials: {
        accessKeyId: config.minioAccessKey,
        secretAccessKey: config.minioSecretKey,
      },
      forcePathStyle: true, // Crucial for MinIO path resolving
    });
  }

  public static getInstance(): MinioService {
    if (!MinioService.instance) {
      MinioService.instance = new MinioService();
    }
    return MinioService.instance;
  }

  /**
   * Assures the bucket exists, creating it if missing.
   */
  public async ensureBucketExists(): Promise<void> {
    if (this.isInitialized) return;

    try {
      logger.debug(`[MinIO Service] Checking if bucket "${this.bucketName}" exists...`);
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      this.isInitialized = true;
      logger.info(`[MinIO Service] Bucket "${this.bucketName}" verified.`);
    } catch (err: any) {
      // If bucket doesn't exist, HeadBucket throws a 404/NotFound error
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        logger.warn(`[MinIO Service] Bucket "${this.bucketName}" not found. Creating bucket...`);
        try {
          await this.client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
          this.isInitialized = true;
          logger.info(`[MinIO Service] Bucket "${this.bucketName}" successfully created.`);
        } catch (createErr: any) {
          logger.error(`[MinIO Service] Failed to create bucket:`, createErr);
          throw createErr;
        }
      } else {
        logger.error(`[MinIO Service] HeadBucket query failed:`, err);
        throw err;
      }
    }
  }

  /**
   * Uploads a file buffer directly to MinIO.
   */
  public async uploadBuffer(key: string, buffer: Buffer, contentType?: string): Promise<string> {
    await this.ensureBucketExists();
    const cleanKey = this.normalizeKey(key);

    try {
      logger.debug(`[MinIO Service] Uploading buffer to key: ${cleanKey} (${buffer.length} bytes)`);
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: cleanKey,
          Body: buffer,
          ContentType: contentType || 'application/octet-stream',
        })
      );
      return cleanKey;
    } catch (error: any) {
      logger.error(`[MinIO Service] Upload buffer failed for key ${cleanKey}:`, error);
      throw error;
    }
  }

  /**
   * Uploads text content directly to MinIO.
   */
  public async uploadText(key: string, text: string, contentType?: string): Promise<string> {
    const buffer = Buffer.from(text, 'utf-8');
    return this.uploadBuffer(key, buffer, contentType || 'text/plain; charset=utf-8');
  }

  /**
   * Fetches an object from MinIO and returns it as a Buffer.
   */
  public async getObjectBuffer(key: string): Promise<Buffer> {
    await this.ensureBucketExists();
    const cleanKey = this.normalizeKey(key);

    try {
      logger.debug(`[MinIO Service] Downloading key: ${cleanKey}`);
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: cleanKey,
        })
      );

      if (!response.Body) {
        throw new Error(`Empty body returned for key: ${cleanKey}`);
      }

      return await this.streamToBuffer(response.Body as Readable);
    } catch (error: any) {
      logger.error(`[MinIO Service] Download failed for key ${cleanKey}:`, error);
      throw error;
    }
  }

  /**
   * Deletes an object from MinIO.
   */
  public async deleteObject(key: string): Promise<void> {
    await this.ensureBucketExists();
    const cleanKey = this.normalizeKey(key);

    try {
      logger.info(`[MinIO Service] Deleting key: ${cleanKey}`);
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: cleanKey,
        })
      );
    } catch (error: any) {
      logger.error(`[MinIO Service] Delete failed for key ${cleanKey}:`, error);
      throw error;
    }
  }

  /**
   * Helper to convert response stream to buffer.
   */
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Sanitizes local paths or keys so they are relative keys inside MinIO.
   */
  private normalizeKey(key: string): string {
    // If the key is an absolute path or has config.uploadsDir prefix, strip it
    let clean = key.replace(/\\/g, '/');
    const prefixPattern = new RegExp(`^.*?${config.uploadsDir}/`, 'i');
    clean = clean.replace(prefixPattern, '');
    // Strip leading slashes
    return clean.replace(/^\/+/, '');
  }

  // Getter for the S3 client (used in multer-s3)
  public getS3Client(): S3Client {
    return this.client;
  }
}

export default MinioService;
