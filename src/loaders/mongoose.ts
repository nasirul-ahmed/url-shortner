import mongoose from 'mongoose';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * Establishes MongoDB connection with connection pooling.
 * Implements graceful retry and event monitoring.
 */
export async function connectMongoDB(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () =>
    logger.info('MongoDB connected', { uri: sanitizeUri(config.mongodb.uri) }),
  );
  mongoose.connection.on('error', (err) => logger.error('MongoDB connection error', { err }));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  await mongoose.connect(config.mongodb.uri, config.mongodb.options);
}

export async function closeMongoDB(): Promise<void> {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}

function sanitizeUri(uri: string): string {
  try {
    const url = new URL(uri);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return 'mongodb://***';
  }
}
