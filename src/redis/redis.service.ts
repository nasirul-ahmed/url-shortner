// import { Service } from 'typedi';
// import Redis from 'ioredis';
// import Container from 'typedi';
// import { REDIS_CLIENT } from '../loaders/redis';
// import { config } from '../config';
// import { IClickEvent, IAnalyticsSummary } from '../interfaces';
// import { logger } from '../utils/logger';

// const { keyPrefix, ttl } = config.redis;

// @Service()
// export class RedisRepository {
//   private readonly client: Redis;

//   constructor() {
//     this.client = Container.get<Redis>(REDIS_CLIENT);
//   }

//   /**
//    * Cache a URL mapping with 24h TTL.
//    */
//   async setUrlMapping(shortCode: string, longUrl: string): Promise<void> {
//     try {
//       await this.client.set(`${keyPrefix.url}${shortCode}`, longUrl, 'EX', ttl.urlMapping);
//     } catch (err) {
//       logger.redis('setUrlMapping failed', { shortCode, error: (err as Error).message });
//       throw new Error(err);
//     }
//   }

//   /**
//    * Fetch URL from cache. Returns null on miss.
//    */
//   async getUrlMapping(shortCode: string): Promise<string | null> {
//     try {
//       return await this.client.get(`${keyPrefix.url}${shortCode}`);
//     } catch (err) {
//       logger.redis('getUrlMapping failed', { shortCode, error: (err as Error).message });
//       return null; // Degrade gracefully - fall through to DB
//     }
//   }

//   /**
//    * Delete URL mapping from cache (on deactivation).
//    */
//   async deleteUrlMapping(shortCode: string): Promise<void> {
//     try {
//       await this.client.del(`${keyPrefix.url}${shortCode}`);
//     } catch (err) {
//       logger.redis('deleteUrlMapping failed', { shortCode });
//     }
//   }

//   /**
//    * Acquire distributed lock for alias registration.
//    * Uses SETNX (atomic) to prevent race conditions across instances.
//    * Returns true if lock was acquired, false if alias is taken.
//    */
//   async acquireAliasLock(alias: string): Promise<boolean> {
//     try {
//       const result = await this.client.set(
//         `${keyPrefix.alias}${alias}`,
//         '1',
//         'EX',
//         30, // 30s lock expiry
//         'NX', // Set only if not exists
//       );
//       return result === 'OK';
//     } catch (err) {
//       logger.redis('acquireAliasLock failed', { alias });
//       return false;
//     }
//   }

//   async releaseAliasLock(alias: string): Promise<void> {
//     try {
//       await this.client.del(`${keyPrefix.alias}${alias}`);
//     } catch {
//       // Non-critical - TTL will handle cleanup
//     }
//   }

//   /**
//    * Records a click event in Redis using a pipeline for atomic multi-write.
//    * All analytics writes are non-blocking (fire and forget in callers).
//    */
//   async recordClick(event: IClickEvent): Promise<void> {
//     const { shortCode, country, device, timestamp } = event;
//     const pipeline = this.client.pipeline();

//     // Increment total click counter
//     pipeline.incr(`${keyPrefix.clicksTotal}${shortCode}`);

//     // Increment country counter
//     pipeline.hincrby(`${keyPrefix.country}${shortCode}`, country, 1);

//     // Increment device counter
//     pipeline.hincrby(`${keyPrefix.device}${shortCode}`, device, 1);

//     // Sliding window: store timestamp in sorted set, score = timestamp
//     // ZADD + ZREMRANGEBYSCORE to maintain last 60s only
//     const windowKey = `${keyPrefix.clicksWindow}${shortCode}`;
//     const now = timestamp;
//     const cutoff = now - ttl.analyticsWindow * 1000;

//     pipeline.zadd(windowKey, now, `${now}-${Math.random()}`);
//     pipeline.zremrangebyscore(windowKey, '-inf', cutoff);
//     pipeline.expire(windowKey, ttl.analyticsWindow * 2);

//     try {
//       await pipeline.exec();
//     } catch (err) {
//       logger.redis('recordClick pipeline failed', { shortCode, error: (err as Error).message });
//     }
//   }

//   async getTotalClicks(shortCode: string): Promise<number> {
//     try {
//       const val = await this.client.get(`${keyPrefix.clicksTotal}${shortCode}`);
//       return val ? parseInt(val, 10) : 0;
//     } catch {
//       return 0;
//     }
//   }

//   async getLast60sClicks(shortCode: string): Promise<number> {
//     try {
//       const windowKey = `${keyPrefix.clicksWindow}${shortCode}`;
//       const cutoff = Date.now() - 60 * 1000;
//       return await this.client.zcount(windowKey, cutoff, '+inf');
//     } catch {
//       return 0;
//     }
//   }

//   async getCountryBreakdown(shortCode: string): Promise<Record<string, number>> {
//     try {
//       const data = await this.client.hgetall(`${keyPrefix.country}${shortCode}`);
//       return Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, parseInt(v, 10)]));
//     } catch {
//       return {};
//     }
//   }

//   async getDeviceBreakdown(shortCode: string): Promise<Record<string, number>> {
//     try {
//       const data = await this.client.hgetall(`${keyPrefix.device}${shortCode}`);
//       return Object.fromEntries(Object.entries(data || {}).map(([k, v]) => [k, parseInt(v, 10)]));
//     } catch {
//       return {};
//     }
//   }


//   async ping(): Promise<boolean> {
//     try {
//       const res = await this.client.ping();
//       return res === 'PONG';
//     } catch {
//       return false;
//     }
//   }
// }
