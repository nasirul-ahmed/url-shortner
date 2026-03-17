import { Service } from 'typedi';
import { LRUCache } from 'lru-cache';

interface ILocalCacheSetInput<T> {
  key: string;
  data: T;
  ttl?: number; // seconds
}

@Service()
export class LocalCacheService {
  private readonly cache: LRUCache<string, unknown>;

  constructor() {
    this.cache = new LRUCache<string, unknown>({
      max: 10000,
      ttl: 1000 * 60 * 5, // 5 minutes default
      updateAgeOnGet: false, // don't relink on every read
      updateAgeOnHas: false,
      allowStale: false,
    });
  }

  public set<T>(input: ILocalCacheSetInput<T>): boolean {
    const { key, data, ttl } = input;

    this.cache.set(key, data, {
      ttl: ttl ? ttl * 1000 : this.cache.ttl,
    });

    return true;
  }

  public get<T>(key: string): T | undefined {
    const value = this.cache.get(key);

    if (!value) return undefined;

    return value as T;
  }

  public delete(key: string): boolean {
    return this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  public has(key: string): boolean {
    return this.cache.has(key);
  }

  public size(): number {
    return this.cache.size;
  }
}
