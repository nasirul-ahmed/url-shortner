import 'reflect-metadata';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCompress from '@fastify/compress';
import { config } from '../config';
import { AppLogger } from '../services/logger/app-logger';
import fastifyRateLimit from '@fastify/rate-limit';

export async function createApp(logger: AppLogger): Promise<{
  fastify: FastifyInstance;
  httpServer: any;
}> {
  const fastify = Fastify({
    logger: false, // Structured logging
    trustProxy: true, // Running behind Nginx
    bodyLimit: 1048576,
  });

  await fastify.register(fastifyCors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'DELETE'],
  });

  await fastify.register(fastifyCompress, {
    global: true,
    encodings: ['gzip', 'deflate'],
  });

  console.log('Api prefix', config.app.apiPrefix);

  await fastify.register(fastifyRateLimit, {
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
    errorResponseBuilder: () => ({
      status: 4004,
      message: 'Too many requests. Please slow down.',
      error: {},
    }),
  });

  fastify.setErrorHandler((error, _request, reply) => {
    logger.error('Fastify caught unhandled error', error);
    reply.code(400).send({ status: 5000, message: 'Internal server error', error: {} });
  });

  fastify.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ status: 4003, message: 'Route not found', error: {} });
  });

  // Use Fastify's built-in HTTP server
  const httpServer = fastify.server;

  return { fastify, httpServer };
}
