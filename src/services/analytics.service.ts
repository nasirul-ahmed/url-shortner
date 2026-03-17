import { Service } from 'typedi';
import { InjectRedis, Redis } from '../redis';
import { UrlModel } from '../models/url.model';
import { SocketService } from './socket.service';
import { AppLogger } from './logger/app-logger';
import { RedlockClient } from './cache/redlock';
import { IAnalyticsService } from '../interfaces/service.interface';

@Service()
export class AnalyticsService implements IAnalyticsService {
  private readonly redisKeyPrefix = 'click:';

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly socketService: SocketService,
    private readonly redlock: RedlockClient,
    private readonly logger: AppLogger,
  ) {
    this.scheduleFlush();
  }

  /**
   * Called from the redirect handler. Increments Redis counter non-blocking
   * and broadcasts the update via Socket.IO.
   */
  public async processClick(shortCode: string): Promise<void> {
    const key = `${this.redisKeyPrefix}${shortCode}`;

    try {
      const count = await this.redis.incr(key);

      // make sure the key expires in a reasonable time in case flush never runs
      await this.redis.expire(key, 120);

      this.socketService.emitClickUpdate(shortCode, count);
    } catch (err) {
      this.logger.error('failed to record click in redis', err);
    }
  }

  // placeholder implementation, real analytics endpoints can be added later
  public async getAnalytics(shortCode: string) {
    return {
      shortCode,
      totalClicks: 0,
      last60sClicks: 0,
      deviceBreakdown: {},
      countryBreakdown: {},
      recentEvents: [],
    };
  }

  /**
   * Scan Redis for click:* keys, aggregate counts, and bulk-write to Mongo.
   * The method is intended to run periodically.  A distributed lock ensures
   * only one worker performs work when running in a clustered environment.
   */
  public async flushClicksToMongo(): Promise<void> {
    const lockKey = 'flush:clicks:lock';
    let lock = null;

    try {
      lock = await this.redlock.acquireLock(lockKey, 25_000);
    } catch {
      // another process has the lock; skip this cycle
      return;
    }

    try {
      let cursor: string = '0';
      const bulkOps: any[] = [];
      const scanCount = 1000;

      do {
        const [nextCursor, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          `${this.redisKeyPrefix}*`,
          'COUNT',
          scanCount,
        );
        cursor = nextCursor as string;

        if (keys.length === 0) continue;

        const counts = await this.redis.mget(keys);

        for (let i = 0; i < keys.length; i++) {
          const raw = counts[i];
          const count = raw ? parseInt(raw, 10) : 0;
          if (count <= 0) continue;

          const shortCode = keys[i].slice(this.redisKeyPrefix.length);
          bulkOps.push({
            updateOne: {
              filter: { shortCode },
              update: { $inc: { clickCount: count } },
            },
          });
        }

        // delete processed keys immediately so they don't get counted again
        await this.redis.unlink(keys);

        if (bulkOps.length >= 500) {
          await UrlModel.bulkWrite(bulkOps);
          bulkOps.length = 0;
        }
      } while (cursor !== '0');

      if (bulkOps.length) {
        await UrlModel.bulkWrite(bulkOps);
      }
    } catch (err) {
      this.logger.error('error flushing clicks to mongo', err);
    } finally {
      if (lock) {
        try {
          await this.redlock.releaseLock(lock);
        } catch {
          /* ignore */
        }
      }
    }
  }

  private scheduleFlush(): void {
    const interval = setInterval(() => {
      this.flushClicksToMongo().catch((error) => {
        this.logger.error('periodic flush failed', error);
      });
    }, 60_000);
    interval.unref();
  }
}
