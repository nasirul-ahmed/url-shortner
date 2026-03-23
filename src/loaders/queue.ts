import { createRedisClient } from '../redis';
import { Queue } from 'bullmq';

export default () => {
  return new Queue('shorturl-queue', {
    connection: createRedisClient() as any,
  });
};
