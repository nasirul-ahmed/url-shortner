import { Service } from 'typedi';
import { AppLogger } from './logger';
import { CacheService } from './cache/cache-client';
import { RedlockClient } from './cache/redlock';
import { ICreateUrlPayload, IUser } from '../interfaces';
import { buildShortUrl, generateShortCode, isValidAlias, isValidUrl, normalizeUrl } from '../utils/shortCode';
import { AppError } from '../errors/AppError';
import { ErrorCodes } from '../errors';
import { UrlModel } from '../models/url.model';
import { Lock } from 'redlock';
import { LocalCacheService } from './cache';
import { convertToObjectId } from '../utils/helper';
import dayjs from 'dayjs';
import { PipelineStage } from 'mongoose';

export const SHORT_CODE_LIFE = 60 * 60 * 24; // 24h for shortCode life

@Service()
export class UrlShortenerService {
  constructor(
    private readonly logger: AppLogger,
    private readonly redlock: RedlockClient,
    private readonly cacheService: CacheService,
    private readonly localCache: LocalCacheService,
  ) {}

  private readonly memCache = new Map<string, string>();
  private readonly MEM_CACHE_MAX = 50_000;

  private setMemCache(key: string, value: string) {
    if (this.memCache.size >= this.MEM_CACHE_MAX) {
      // delete oldest entry (Maps preserve insertion order)
      const firstKey = this.memCache.keys().next().value;
      this.memCache.delete(firstKey);
    }
    this.memCache.set(key, value);
  }

  private getUrlCacheKey(shortCode: string) {
    return `url:${shortCode}`;
  }

  private setLocalCacheMapping(shortCode: string, longUrl: string) {
    this.localCache.set({
      key: this.getUrlCacheKey(shortCode),
      data: longUrl,
      ttl: 5, // in seconds for local cache - lets not bloat it up
    });
  }

  private async cacheMapping(shortCode: string, longUrl: string) {
    await this.cacheService.setCache({
      key: this.getUrlCacheKey(shortCode),
      data: longUrl,
      expire: SHORT_CODE_LIFE,
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

    await this.cacheMapping(shortCode, longUrl);

    this.setLocalCacheMapping(shortCode, longUrl);

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

    const memory = this.localCache.get<string>(cacheKey);

    if (memory) {
      return memory;
    }

    const cached = await this.cacheService.getCache<string>(cacheKey);

    if (cached) {
      this.setLocalCacheMapping(shortCode, cached);

      // setImmediate(async () => this.setLocalCacheMapping(shortCode, cached))
      return cached;
    }

    const urlDoc = await UrlModel.findOne({ shortCode }).select('longUrl').lean();

    if (!urlDoc) {
      throw new AppError({ code: ErrorCodes.NOT_FOUND });
    }

    await this.cacheMapping(shortCode, urlDoc.longUrl);
    this.setLocalCacheMapping(shortCode, urlDoc.longUrl);

    return urlDoc.longUrl;
  }

  public async links(limit: number, page: number, user: IUser) {
    const skip = (page - 1) * limit;
    const query: any = {
      user: convertToObjectId(user._id),
    };

    console.log({ query });

    // const response = await UrlModel.aggregate([
    //   { $match: matchStage },
    //   { $sort: { createdAt: -1 } },
    //   {
    //     $facet: {
    //       metadata: [{ $count: 'total' }],
    //       /* {
    //         $lookup: {
    //           from: "users",
    //           localField: "user",
    //           foreignField: "_id",
    //           as: "userDetails"
    //         }
    //       },
    //       { $unwind: "$userDetails" }
    //       */
    //       data: [{ $skip: skip }, { $limit: limit }],
    //     },
    //   },
    //   {
    //     $project: {
    //       total: { $arrayElemAt: ['$metadata.total', 0] },
    //       links: '$data',
    //     },
    //   },
    // ]);

    // const returnData = response[0] || { total: 0, links: [] };

    const [links, total] = await Promise.all([
      UrlModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      UrlModel.countDocuments(query),
    ]);

    const returnData = {
      links: links,
      pagination: {
        total: total || 0,
        page,
        limit,
        totalPages: Math.ceil((total || 0) / limit),
      },
    };

    // this.logger.info('return Data', { data: returnData });

    return returnData;
  }

  public async dashboard(input: { startDate: string; endDate: string }, user: IUser) {
    const start = input.startDate
      ? dayjs(input.startDate).startOf('day').toDate()
      : dayjs().subtract(7, 'days').startOf('day').toDate();

    const end = input.endDate ? dayjs(input.endDate).endOf('day').toDate() : dayjs().endOf('day').toDate();

    const pipelines: PipelineStage[] = [
      {
        $match: {
          // userId: convertToObjectId(user._id),
          updatedAt: {
            $gte: start,
            $lt: end,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalLinks: { $sum: 1 },
          totalClicks: { $sum: '$clickCount' },
          avgClicks: { $avg: '$clickCount' },
          uniqueVisitors: { $addToSet: '$longUrl' },
          activeLinksCount: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalLinks: 1,
          totalClicks: 1,
          avgClicks: { $round: ['$avgClicks', 2] },
          uniqueVisitors: { $size: '$uniqueVisitors' },
          activeLinksCount: '$activeLinksCount',
        },
      },
    ];

    const [result] = await UrlModel.aggregate(pipelines);

    this.logger.info('dashboard aggregation result', { data: result as any });

    return result || { totalLinks: 0, totalClicks: 0, avgClicks: 0, uniqueVisitors: 0, activeLinksCount: 0 };
  }

  private async generateUniqueCode(attempts = 0): Promise<string> {
    if (attempts >= 5) throw new Error('Could not generate unique short code');

    const code = generateShortCode();
    const exists = await UrlModel.exists({ shortCode: code });

    if (exists) return this.generateUniqueCode(attempts + 1);

    return code;
  }

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
