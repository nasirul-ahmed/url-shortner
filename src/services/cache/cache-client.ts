import { Service } from 'typedi';
import { InjectRedis, Redis } from '../../redis';
import { ISetCacheInput } from '../../interfaces/redis.interfaces';

@Service()
export class CacheService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  private serialize(data: unknown): string {
    return JSON.stringify(data);
  }

  private deserialize<T>(data: string | null): T | undefined {
    if (!data) return undefined;

    try {
      return JSON.parse(data);
    } catch {
      return undefined;
    }
  }

  public async setCache<T>(input: ISetCacheInput<T>): Promise<boolean> {
    const { data, expire, key } = input;

    await this.redis.setex(key, expire, this.serialize(data));

    return true;
  }

  public async getCache<T>(key: string | string[]): Promise<T | undefined> {
    if (Array.isArray(key)) {
      const data = await this.redis.mget(key);

      if (!data) return undefined;

      const cacheData: any = [];

      for (let index = 0; index < key.length; index++) {
        const _key = key[index];

        if (data[index]) cacheData[_key] = JSON.parse(data[index]);
      }

      return cacheData;
    }

    const data = await this.redis.get(key);

    return this.deserialize(data);
  }

  public async setMap<T extends Record<string, any>>(key: string, data: T, expire?: number): Promise<boolean> {
    const entries = Object.entries(data).map(([field, value]) => [field, this.serialize(value)]);

    await this.redis.hset(key, Object.fromEntries(entries));

    if (expire) {
      await this.redis.expire(key, expire);
    }

    return true;
  }

  public async getMap<T>(key: string): Promise<Record<string, T> | undefined> {
    const data = await this.redis.hgetall(key);

    if (!data || Object.keys(data).length === 0) return undefined;

    const parsed: Record<string, T> = {};

    for (const field in data) {
      parsed[field] = this.deserialize(data[field]);
    }

    return parsed;
  }

  public async setNX(key: string, value: string, ttl: number): Promise<boolean> {
    const result = await this.redis.set(key, value, 'EX', ttl, 'NX');

    return result === 'OK';
  }

  public async delCache(key: string): Promise<boolean> {
    await this.redis.unlink(key);

    return true;
  }

  public async batchDel(pattern: string): Promise<boolean> {
    const keys = await this.redis.keys(pattern);

    if (!keys.length) return true;

    await this.redis.unlink(keys);

    return true;
  }

  public async batchDelKeys(keys: string[]): Promise<boolean> {
    if (!keys.length) return true;

    await this.redis.unlink(keys);

    return true;
  }

  public async extendCacheExpiry(key: string, expiry: number): Promise<number> {
    return this.redis.expire(key, expiry);
  }
}
