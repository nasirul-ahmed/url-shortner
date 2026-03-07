import Redis from 'ioredis';
import Container from 'typedi';
import { createRedisClient, duplicateAsSubscriber } from '../redis/redis.client';
import { logger } from '../utils/logger';

export const REDIS_CLIENT = 'RedisClient';
export const REDIS_SUBSCRIBER = 'RedisSubscriber';

export async function connectRedis(): Promise<[Redis, Redis]> {
  const client = await createRedisClient();
  const subscriber = await duplicateAsSubscriber(client);
  
  Container.set(REDIS_CLIENT, client);
  Container.set(REDIS_SUBSCRIBER, subscriber);
  
  console.log("ping: ", await client.ping())
  logger.info('Redis initialized', {
    component: 'redis',
    connections: 2,
  });

  return [client, subscriber];
}

export async function closeRedis(): Promise<void> {
  const client = Container.get<Redis>(REDIS_CLIENT);
  const subscriber = Container.get<Redis>(REDIS_SUBSCRIBER);

  await Promise.allSettled([client?.quit(), subscriber?.quit()]);
  logger.info('Redis connections closed');
}
