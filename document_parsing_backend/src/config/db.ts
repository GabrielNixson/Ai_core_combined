import mongoose from 'mongoose';
import { config } from './config';
import { logger } from '../utils/logger';

export async function connectDatabase(): Promise<void> {
  const options = {
    autoIndex: true, // Build indexes on startup
  };

  logger.info('Connecting to MongoDB...');

  try {
    await mongoose.connect(config.mongoUri, options);
    logger.info('Successfully connected to MongoDB.');
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting to reconnect...');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error:', err);
  });
}
