import { Service } from 'typedi';
import { FastifyRequest, FastifyReply } from 'fastify';
import { UrlShortenerService } from '../services/url.services';
// import { sendSuccess, sendCreated, sendError } from '../utils/response';
import z from 'zod';
import { AppLogger } from '../services/logger';

const CreateUrlSchema = z.object({
  longUrl: z.string().url('Must be a valid URL').max(2048),
  customAlias: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9-]+$/)
    .optional(),
  expiresAt: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

const ShortCodeParamSchema = z.object({
  shortCode: z.string().min(3).max(30),
});

@Service()
export class UrlController {
  constructor(
    private readonly urlService: UrlShortenerService,
    private readonly logger: AppLogger,
  ) {}

  /**
   * POST /api/shorten
   * Creates a new shortened URL.
   */
  async shorten(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = CreateUrlSchema.parse(request.body);

    const result = await this.urlService.createShortUrl({
      longUrl: body.longUrl,
      customAlias: body.customAlias,
      expiresAt: body.expiresAt,
    });

    this.logger.info('URL shortened', { data: { shortCode: result } });
    // sendCreated(reply, result);
  }

  /**
   * GET /:shortCode
   * Redirects to original URL. This is the hot path.
   */
  async redirect(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { shortCode } = ShortCodeParamSchema.parse(request.params);

    const longUrl = await this.urlService.resolveUrl(
      shortCode,
      request.headers as Record<string, string | string[] | undefined>,
      request.socket.remoteAddress || '0.0.0.0',
    );

    reply.redirect(longUrl);
  }

  async health(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
    return reply.code(200).send({ status: 'ok', timestamp: new Date().toISOString() });
  }
}
