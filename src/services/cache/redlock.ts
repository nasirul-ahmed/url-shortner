import Redlock, { ExecutionResult, Lock } from 'redlock';
import { InjectRedis, Redis } from '../../redis';
import { Service } from 'typedi';
const LOCK_TTL = 300000;

@Service()
export class RedlockClient {
  private readonly redlock: Redlock;

  constructor(@InjectRedis() private readonly redis: Redis) {
    this.redlock = new Redlock([redis], { retryCount: -1, retryDelay: 500 });

    process.once('SIGINT', async () => {
      console.log('quit redlock, start');
      await this.redlock.quit();
      console.log('quit redlock, finish');
    });
  }

  public async acquireLock(resource: string | string[], ttl: number = LOCK_TTL): Promise<Lock> {
    return this.redlock.acquire(Array.isArray(resource) ? resource : [resource], ttl);
  }

  public async releaseLock(lock: Lock): Promise<ExecutionResult | null> {
    if (lock && Date.now() < lock.expiration && lock.expiration !== 0) {
      return await lock.release();
    }

    return null;
  }
}
