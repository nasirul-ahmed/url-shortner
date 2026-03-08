import { Service } from 'typedi';
import { AppLogger } from './logger';
import { CacheService } from './cache/cache-client';
import { RedlockClient } from './cache/redlock';
import { ICreateUrlPayload } from '../interfaces';
import { buildShortUrl, generateShortCode, isValidAlias, isValidUrl, normalizeUrl } from '../utils/shortCode';
import { AppError } from '../errors/AppError';
import { ErrorCodes } from '../errors';
import { UrlModel } from '../models/url.model';
import { Lock } from 'redlock';

@Service()
export class UrlShortenerService {
  constructor(
    private readonly logger: AppLogger,
    private readonly redlock: RedlockClient,
    private readonly cacheService: CacheService,
  ) {}

  private getUrlCacheKey(shortCode: string) {
    return `url:${shortCode}`;
  }

  private async cacheMapping(shortCode: string, longUrl: string) {
    await this.cacheService.setCache({
      key: this.getUrlCacheKey(shortCode),
      data: longUrl,
      expire: 60 * 60 * 24, // 24h for shortCode life
    });
  }

  public async createShortUrl(payload: ICreateUrlPayload) {
    const longUrl = normalizeUrl(payload.longUrl);

    if (!isValidUrl(longUrl)) {
      throw new AppError({ code: ErrorCodes.INVALID_URL });
    }

    let shortCode: string;
    let lock: Lock;

    if (payload.customAlias) {
      const alias = payload.customAlias.trim();

      if (!isValidAlias(alias)) {
        throw new AppError({ code: ErrorCodes.INVALID_ALIAS });
      }

      lock = await this.redlock.acquireLock(`alias:${alias}`);

      try {
        const existing = await UrlModel.findOne({ customAlias: alias }).select('_id').lean();

        if (existing) {
          throw new AppError({ code: ErrorCodes.ALIAS_ALREADY_EXISTS });
        }

        shortCode = alias;
      } finally {
        await this.redlock.releaseLock(lock);
      }
    } else {
      shortCode = await this.generateUniqueCode();
    }

    // cache immediately so first redirect is fast and then store it to db
    await this.cacheMapping(shortCode, longUrl);
    this.persistUrlAsync({ ...payload, longUrl, shortCode });

    return {
      shortCode,
      shortUrl: buildShortUrl(shortCode),
      longUrl,
      createdAt: new Date(),
    };
  }

  public async resolveUrl(shortCode: string): Promise<string> {
    const cacheKey = this.getUrlCacheKey(shortCode);

    const cached = await this.cacheService.getCache<string>(cacheKey);

    if (cached) {
      return cached;
    }

    // const lockKey = `lock:${shortCode}`;

    // const lock = await this.cacheService.setNX(lockKey, '1', 3);

    // if (lock) {
    //   try {
    //     const doc = await UrlModel.findOne({ shortCode }).sort({ _id: -1 }).select('longUrl').lean();

    //     console.log({ doc });

    //     if (!doc) {
    //       throw new AppError({ code: ErrorCodes.NOT_FOUND });
    //     }

    //     await this.cacheMapping(shortCode, doc.longUrl);

    //     return doc.longUrl;
    //   } finally {
    //     await this.cacheService.delCache(lockKey);
    //   }
    // }

    const urlDoc = await UrlModel.findOne({ shortCode, isActive: true }).select('longUrl -_id').lean();

    // console.log(urlDoc)

    if (!urlDoc) {
      throw new AppError({ code: ErrorCodes.NOT_FOUND });
    }

    await this.cacheMapping(shortCode, urlDoc.longUrl);

    return urlDoc.longUrl;

    // someone else rebuilding cache
    // await new Promise((r) => setTimeout(r, 50));

    // const retry = await this.cacheService.getCache<string>(cacheKey);

    // if (retry) return retry;

    // throw new AppError({ code: ErrorCodes.NOT_FOUND });
  }

  private async generateUniqueCode(attempts = 0): Promise<string> {
    if (attempts >= 5) throw new Error('Could not generate unique short code');

    const code = generateShortCode();
    const exists = await UrlModel.exists({ shortCode: code });

    if (exists) return this.generateUniqueCode(attempts + 1);

    return code;
  }

  // DB operations
  private async persistUrlAsync(data: any) {
    setImmediate(async () => {
      try {
        await UrlModel.create(data);
      } catch (err) {
        this.logger.error('URL persistence failed', err);
      }
    });
  }
}
