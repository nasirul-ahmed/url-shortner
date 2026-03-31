import * as ioredis from 'ioredis';
import { config } from '../config';
import Container from 'typedi';
import { AppLogger } from '../services/logger/app-logger';

export type Redis = ioredis.Redis;

export function createRedisClient(): Redis {
  const client = new ioredis.Redis({
    host: config.redis.host,
    port: config.redis.port,
    // path: config.redis.redisUrl,
    maxRetriesPerRequest: null,
  });
  const logger: AppLogger = Container.get(AppLogger);

  client.on('connect', () => logger.info(`Redis connected`));
  client.on('ready', () => logger.info(`Redis ready`));
  client.on('reconnecting', () => logger.debug(`reconnecting...`));
  client.on('end', () => logger.info(`Redis end`));
  client.on('error', (err) => logger.error('Redis ' + err.message));

  process.once('SIGTERM', async () => {
    console.log('quit redis, start');
    client.disconnect();
    console.log('quit redis, finish');
  });

  return client;
}

/**
 * Creates a subscriber client for Redis pub/sub operations.
 * Must be a separate connection from the main client (Socket.io adapter requirement).
 * @returns Redis subscriber client
 */
export function createRedisSubscriber(): Redis {
  const subscriber = new ioredis.Redis({
    // path: config.redis.redisUrl,
    host: config.redis.host,
    port: config.redis.port,
    maxRetriesPerRequest: null,
  });
  const logger: AppLogger = Container.get(AppLogger);

  subscriber.on('connect', () => logger.info(`Redis subscriber connected`));
  subscriber.on('ready', () => logger.info(`Redis subscriber ready`));
  subscriber.on('reconnecting', () => logger.debug(`Redis subscriber reconnecting...`));
  subscriber.on('end', () => logger.info(`Redis subscriber end`));
  subscriber.on('error', (err) => logger.error('Redis subscriber ' + err.message));

  process.once('SIGTERM', async () => {
    console.log('quit redis subscriber, start');
    subscriber.disconnect();
    console.log('quit redis subscriber, finish');
  });

  return subscriber;
}
