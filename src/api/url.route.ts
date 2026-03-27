import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Container } from 'typedi';
import { shortCodeParamsValidation, shortenURLPayloadValidation } from '../utils/api-validation';
import { ICreateUrlPayload } from '../interfaces';
import { UrlShortenerService } from '../services/url.services';
import { AnalyticsService } from '../services/analytics.service';
import { AppLogger } from '../services/logger';

export default async function (fastify: FastifyInstance) {
  const logger = Container.get(AppLogger);
  const urlService = Container.get(UrlShortenerService);
  const analyticsService = Container.get(AnalyticsService);

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
    void analyticsService.processClick(shortCode);

    // const longUrl = await this.redirectService.handleRedirect(shortCode);
    // reply.code(200).send(longUrl);

    reply.redirect(longUrl);
  });

  fastify.get(
    '/links',
    {
      preHandler: fastify.authenticate,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { limit: limit, page } = request.params as { limit: number; page: number };

      const data = await urlService.links(limit, page, request.user);

      reply.send(data);
    },
  );
}
