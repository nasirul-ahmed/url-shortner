import { Service } from 'typedi';
import { FastifyRequest, FastifyReply } from 'fastify';
import { UrlShortenerService } from '../services/url.services';
import { AppLogger } from '../services/logger';
import { CreateUrlValidation, ShortCodeParamsValidation } from '../utils/api-validation';
import { ICreateUrlPayload } from '../interfaces';

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
    const body = CreateUrlValidation.parse(request.body);

    const result = await this.urlService.createShortUrl(body as unknown as ICreateUrlPayload);

    this.logger.info('URL shortened', { data: { shortCode: result } });
    reply.send(result);
  }

  /**
   * GET /:shortCode
   * Redirects to original URL. This is the hot path.
   */
  async redirect(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { shortCode } = ShortCodeParamsValidation.parse(request.params);

    const longUrl = await this.urlService.resolveUrl(shortCode);
    // this.logger.info('redirecting to : ', { data: longUrl as any });

    // reply.code(302).redirect(longUrl);
    reply.code(200).send(longUrl)
  }
}
