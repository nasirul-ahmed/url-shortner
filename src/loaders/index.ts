import { Server } from 'node:http';
import { initializeDependencies } from './dependencyInjector';
import { connectMongoDB } from './mongoose';
import { initSocketIO } from './socket-io';
import { FastifyInstance } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { AppLogger } from '../services/logger/app-logger';
import { createRedisClient, createRedisSubscriber } from '../redis';
import { decorateAuthMiddleware } from './decorators';
import { registerRoutes } from '../api';
import workers from './worker';

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

  const models = [
    {
      name: 'userModel',
      model: require('../models/user.model').default,
    },
    {
      name: 'urlModel',
      model: require('../models/url.model').default,
    },
    {
      name: 'analyticsModel',
      model: require('../models/analytics.model').AnalyticsModel,
    },
    {
      name: 'sessionModel',
      model: require('../models/session.model').SessionModel,
    },
  ];

  // Register cookie plugin
  await fastify.register(fastifyCookie);

  // Initialize Socket.io and dependencies
  await initSocketIO(httpServer, redisPubClient, redisSubClient, logger);

  const { queue } = await initializeDependencies({ models, logger });

  workers({ queue, logger });

  // Decorate Fastify with auth middleware
  await decorateAuthMiddleware(fastify, logger);

  // Register all routes
  await registerRoutes(fastify);

  logger.info('Routes registered successfully');
};
