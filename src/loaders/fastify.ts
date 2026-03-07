import 'reflect-metadata';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCompress from '@fastify/compress';
import fastifyRateLimit from '@fastify/rate-limit';
import { createServer } from 'http';
import { config } from '../config';
import { logger } from '../utils/logger';
import Container from 'typedi';
// import { UrlController } from '../controllers/url.controller';

export async function createApp(): Promise<{
  fastify: FastifyInstance;
  httpServer: ReturnType<typeof createServer>;
}> {
  const fastify = Fastify({
    logger: false, // Structured logging via Winston
    trustProxy: true, // Running behind Nginx
    bodyLimit: 1048576,
  });

  // ─── Plugins ────

  await fastify.register(fastifyCors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'DELETE'],
  });

  await fastify.register(fastifyCompress, {
    global: true,
    encodings: ['gzip', 'deflate'],
  });

  await fastify.register(fastifyRateLimit, {
    prefix: config.app.apiPrefix,
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
    errorResponseBuilder: () => ({
      status: 4004,
      message: 'Too many requests. Please slow down.',
      error: {},
    }),
  });

  // ─── Routes ─────

  // const urlController = Container.get(UrlController);

  // fastify.get('/api/health', urlController.health.bind(urlController));
  // fastify.post('/api/shorten', urlController.shorten.bind(urlController));
  // fastify.get('/api/analytics/:shortCode', urlController.getAnalytics.bind(urlController));

  // // Redirect — hot path, registered last to avoid prefix conflicts
  // fastify.get('/:shortCode', urlController.redirect.bind(urlController));

  // ─── Global Error Handlers ──────

  fastify.setErrorHandler((error, _request, reply) => {
    logger.error('Fastify caught unhandled error', error);
    reply.code(500).send({ status: 5000, message: 'Internal server error', error: {} });
  });

  fastify.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ status: 4003, message: 'Route not found', error: {} });
  });

  // Expose the underlying Node.js HTTP server for Socket.io to share the port
  const httpServer = createServer(fastify.server);

  return { fastify, httpServer };
}
