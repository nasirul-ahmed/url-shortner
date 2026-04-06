import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Container } from 'typedi';
import { shortCodeParamsValidation, shortenURLPayloadValidation } from '../utils/api-validation';
import { ICreateUrlPayload } from '../interfaces';
import { UrlShortenerService } from '../services/url.services';
import { AnalyticsDashboardService } from '../services/analytics-dashboard.service';
import { AppLogger } from '../services/logger';
import { AppError } from '../errors/AppError';
import { ErrorCodes } from '../errors';
import { Queue } from 'bullmq';
import { JobIdEnums, AnalyticsJobData } from '../loaders/worker';
import { extractIp, getGeoInfo, getDeviceInfo } from '../utils/geoDevice';
import { generateVisitorId } from '../utils/visitor-id';

export default async function (fastify: FastifyInstance) {
  const logger = Container.get(AppLogger);
  const urlService = Container.get(UrlShortenerService);
  const analyticsDashboardService = Container.get(AnalyticsDashboardService);
  const analyticsQueue = Container.get('shorturl-queue') as Queue;

  // Create short URL (requires authentication)
  fastify.post(
    '/shorten',
    // { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const body = shortenURLPayloadValidation.parse(request.body);
      const userId = request.user?._id; // Get authenticated user ID

      const payload: ICreateUrlPayload = {
        ...body,
        userId,
      };

      const result = await urlService.createShortUrl(payload);

      logger.info('URL shortened', { data: { shortCode: result.shortCode, userId } });
      reply.send(result);
    },
  );

  // Public: Redirect to original URL
  fastify.get('/:shortCode', async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const { shortCode } = shortCodeParamsValidation.parse(request.params);

    const longUrl = await urlService.resolveUrl(shortCode);

    // Collect analytics data asynchronously (fire-and-forget)
    const ip = extractIp(request.headers, request.ip);
    const userAgent = request.headers['user-agent'] || '';
    const referer = request.headers.referer || request.headers.referrer as string;

    const geoInfo = getGeoInfo(ip);
    const deviceInfo = getDeviceInfo(userAgent);
    const visitorId = generateVisitorId(ip, userAgent);

    const analyticsData: AnalyticsJobData = {
      shortCode,
      originalUrl: longUrl,
      metadata: {
        ip,
        userAgent,
        referer,
        country: geoInfo.country,
        device: deviceInfo.device,
        platform: deviceInfo.platform,
        browser: deviceInfo.browser,
        visitorId,
      },
      timestamp: new Date(),
    };

    void analyticsQueue.add(JobIdEnums.PROCESS_CLICK_ANALYTICS, analyticsData);

    reply.redirect(longUrl);
  });

  fastify.get(
    '/links',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      logger.info('/links api called ==> ', { data: request.query as any });
      const { limit, page } = request.query as { limit: number; page: number };

      // console.log({ limit, page });

      if (!request.user) {
        throw new AppError({ code: ErrorCodes.UNAUTHORIZED });
      }

      const data = await urlService.links(limit, page, request.user);

      // console.log(JSON.stringify(data));
      // reply.send(data);

      return data;
    },
  );

  fastify.get(
    '/dashboard',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      logger.info('/dashboard api called ==> ');

      const result = await urlService.dashboard(request.query as { startDate: string; endDate: string });

      return result;
    },
  );

  fastify.get(
    '/analytics/:shortCode',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { shortCode } = shortCodeParamsValidation.parse(request.params);
      const { days = 30 } = request.query as { days?: number };

      logger.info('/analytics api called', {data: { shortCode, days }});

      const analytics = await analyticsDashboardService.getAnalytics(shortCode, days);
      return analytics;
    },
  );

  fastify.get(
    '/analytics',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { days = 30 } = request.query as { days?: number };

      logger.info('/analytics api called');

      const analytics = await analyticsDashboardService.getOverallAnalytics(days);
      return analytics;
    },
  );
}
