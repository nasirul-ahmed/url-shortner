import 'reflect-metadata';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCompress from '@fastify/compress';
import { config, TEMPLATE_DIR } from '../config';
import { AppLogger } from '../services/logger/app-logger';
import fastifyRateLimit from '@fastify/rate-limit';
import { ErrorCodes } from '../errors';
import { AppError } from '../errors/AppError';
import { ZodError } from 'zod';
import { ErrorMessages } from '../errors/errorCodes';
import view from '@fastify/view';
import ejs from 'ejs';
import path from 'node:path';

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

  await fastify.register(view, {
    engine: {
      ejs: ejs,
    },
    root: TEMPLATE_DIR
  });

  // await fastify.register(fastifyRateLimit, {
  //   max: config.rateLimit.max,
  //   timeWindow: config.rateLimit.timeWindow,
  //   errorResponseBuilder: () => ({
  //     status: 4004,
  //     message: 'Too many requests. Please slow down.',
  //     error: {},
  //   }),
  // });

  fastify.setErrorHandler((error, _request, reply) => {
    console.log(error);
    logger.error('API Error:', { data: error as unknown as Record<string, unknown> });

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        status: error.code,
        message: error.message || ErrorMessages[error.code],
        details: error.details || {},
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        status: ErrorCodes.BAD_REQUEST,
        message: 'Validation failed',
        details: error,
      });
    }

    // Fallback to INTERNAL_SERVER_ERROR
    reply.code(500).send({ status: 5000, message: 'Internal server error', details: {} });
  });

  fastify.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ status: ErrorCodes.NOT_FOUND, message: 'Not found', details: {} });
  });

  // Use Fastify's built-in HTTP server
  const httpServer = fastify.server;

  return { fastify, httpServer };
}
