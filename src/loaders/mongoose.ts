import mongoose from 'mongoose';
import { config } from '../config';
import Container from 'typedi';
import { AppLogger } from '../services/logger/app-logger';

/**
 * Establishes MongoDB connection with connection pooling.
 * Implements graceful retry and event monitoring.
 */
export async function connectMongoDB(): Promise<void> {
  const logger = Container.get(AppLogger);
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () =>
    logger.info('MongoDB connected', { data: { sanitizeUri: sanitizeUri(config.mongodb.uri) } }),
  );
  mongoose.connection.on('error', (err) => logger.error('MongoDB connection error', { data: err }));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  await mongoose.connect(config.mongodb.uri, config.mongodb.options);
}

export async function closeMongoDB(): Promise<void> {
  const logger = Container.get(AppLogger);
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
