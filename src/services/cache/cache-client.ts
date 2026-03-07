import { Service } from 'typedi';
import { InjectRedis, Redis } from '../../redis';
import { ISetCacheInput } from '../../interfaces/redis.interfaces';

@Service()
export class CacheService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  public async setCache<T>(input: ISetCacheInput<T>): Promise<boolean> {
    const { data, expire, key } = input;

    const json = JSON.stringify(data);

    await this.redis.setex(key, expire, json);

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

    if (!data) return undefined;

    const cache = JSON.parse(data);

    return cache;
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
