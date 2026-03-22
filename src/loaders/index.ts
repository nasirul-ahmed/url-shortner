import { Server } from 'node:http';
import { initializeDependencies } from './dependencyInjector';
import { connectMongoDB } from './mongoose';
import { initSocketIO } from './socket-io';
import { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { AppLogger } from '../services/logger/app-logger';
import { createRedisClient, createRedisSubscriber } from '../redis';
import { config } from '../config';
import { decorateAuthMiddleware } from './decorators';
import { registerRoutes } from '../api';

export default async ({
  fastify,
  httpServer,
  logger,
}: {
  fastify: FastifyInstance;
  httpServer: Server;
  logger: AppLogger;
}): Promise<void> => {
  // Create separate pub and sub clients for Redis adapter
  // Socket.io adapter requires two distinct connections
  const redisPubClient = createRedisClient();
  const redisSubClient = createRedisSubscriber();

  await connectMongoDB();

  const urlModel = {
    name: 'urlModel',
    model: require('../models/url.model').default,
  };

  const sessionModel = {
    name: 'sessionModel',
    model: require('../models/session.model').SessionModel,
  };

  // Register cookie plugin
  await fastify.register(fastifyCookie);

  // Initialize Socket.io and dependencies
  await initSocketIO(httpServer, redisPubClient, redisSubClient, logger);
  await initializeDependencies({ models: [urlModel, sessionModel], logger });

  // Decorate Fastify with auth middleware
  await decorateAuthMiddleware(fastify);

  // Register all routes
  await registerRoutes(fastify);

  logger.info('Routes registered successfully');
};
