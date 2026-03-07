import Redis, { RedisOptions } from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';

const baseOptions: Redis["options"] = {
  host: config.redis.host,
  port: config.redis.port,
  lazyConnect: false,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  connectTimeout: 10000,
  keepAlive: 30000,
  enableReadyCheck: false,
  retryStrategy: (times: number) => {
    if (times > 10) {
      logger.redis('Max reconnection attempts reached');
      return null;
    }
    return Math.min(times * 200, 3000);
  },
};

export async function createRedisClient(): Promise<Redis> {
  const client = new Redis(baseOptions);

  attachListeners(client);
  // client.once('ready', () => logger.info('Redis client ready'));
  // client.once('error', (err) => {
  //   logger.redis('Redis client error', { error: err.message });
  //   client.quit();
  // });

  // await client.connect();

  return client;
}

export async function duplicateAsSubscriber(client: Redis): Promise<Redis> {
  const subscriber = client.duplicate({ enableReadyCheck: false });

  attachListeners(subscriber);
  // subscriber.once('ready', () => logger.info('Redis subscriber ready'));
  // subscriber.once('error', (err) => {
  //   logger.redis('Redis subscriber error', { error: err.message });
  //   subscriber.quit();
  // });

  // await subscriber.connect();
  return subscriber;
}

function attachListeners(client: Redis): void {
  client.on('connect', () => logger.info(`Redis connected`));
  client.on('ready', () => logger.info(`Redis ready`));
  client.on('error', (err) => logger.redis(`error`, { error: err.message }));
  client.on('close', () => logger.redis(`connection closed`));
  client.on('reconnecting', () => logger.redis(`reconnecting...`));
}
