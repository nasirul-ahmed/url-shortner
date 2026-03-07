import { Server } from 'node:http';
import { initializeDependencies } from './dependencyInjector';
import { connectMongoDB } from './mongoose';
import { initSocketIO } from './socket-io';
import { FastifyInstance } from 'fastify';
import { AppLogger } from '../services/logger/app-logger';
import { createRedisClient, createRedisSubscriber } from '../redis';
import { config } from '../config';

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

  // 4. Socket.io — attaches to httpServer, uses Redis pub/sub clients
  await initSocketIO(httpServer, redisPubClient, redisSubClient, logger);
  await initializeDependencies({ models: [urlModel], logger });

  const Container = require('typedi').default || require('typedi');
  const { UrlController } = require('../api/url.controller');
  const urlController = Container.get(UrlController);

  // Register routes with API prefix
  await fastify.register(
    async (api) => {
      api.get('/health', urlController.health.bind(urlController));
      api.post('/shorten', urlController.shorten.bind(urlController));
      api.get('/:shortCode', urlController.redirect.bind(urlController));
    },
    { prefix: config.app.apiPrefix },
  );

  logger.info('Routes registered', { data: { prefix: config.app.apiPrefix } });
};
