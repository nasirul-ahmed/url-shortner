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

export async function createApp(logger: AppLogger): Promise<{
  fastify: FastifyInstance;
  httpServer: any;
}> {
  const fastify = Fastify({
    logger: false, // Structured logging
    trustProxy: true, // Running behind Nginx
    bodyLimit: 1048576,
  });

  fastify.register(fastifyCors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-session-id'],
    credentials: true, // Crucial for HttpOnly cookies and session rotation
  });

  await fastify.register(fastifyCompress, {
    global: true,
    encodings: ['gzip', 'deflate'],
  });

  await fastify.register(view, {
    engine: {
      ejs: ejs,
    },
    root: TEMPLATE_DIR,
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

  fastify.addHook('preSerialization', async (request, reply, payload) => {
    if (payload && typeof payload === 'object' && 'success' in payload) {
      return payload;
    }

    return {
      success: true,
      data: payload || {},
      error: null,
    };
  });

  fastify.setErrorHandler((error, request, reply) => {
    // console.log(error);
    logger.error('API Error:', { error: error, context: request.url });

    let statusCode = 500;
    let errorCode = 5000;
    let message = 'Internal server error';
    let details = {};

    if (error instanceof AppError) {
      statusCode = error.statusCode;
      errorCode = error.code;
      message = error.message || ErrorMessages[error.code];
      details = error.details || {};

      // logger.error('API Error:', { error: error, context: request.url });
    } else if (error instanceof ZodError) {
      statusCode = 400;
      errorCode = ErrorCodes.BAD_REQUEST;
      message = 'Validation failed';
      details = error.message;
    }

    // SEND THE SAME SHAPE AS THE SUCCESS HOOK
    return reply.status(statusCode).send({
      success: false,
      data: null,
      error: {
        code: errorCode,
        message: message,
        details: details,
      },
    });
  });

  fastify.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ status: ErrorCodes.NOT_FOUND, message: 'Not found', details: {} });
  });

  // Use Fastify's built-in HTTP server
  const httpServer = fastify.server;

  return { fastify, httpServer };
}
