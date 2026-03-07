import { Server } from 'node:http';
import { initializeDependencies } from './dependencyInjector';
import { connectMongoDB } from './mongoose';
import { connectRedis } from './redis';
import { initSocketIO } from './socket-io';
import { FastifyInstance } from 'fastify';

export default async ({ fastify, httpServer }: { fastify: FastifyInstance; httpServer: Server }): Promise<void> => {
  
  
  const [client, subscriber] = await connectRedis();

  console.log('Connected to Redis', client.ping());

  await connectMongoDB();

  const urlModel = {
    name: 'urlModel',
    model: require('../models/url.model').default,
  };

  await fastify.ready();

  // 4. Socket.io — attaches to httpServer, uses Redis clients & subscribers
  await initSocketIO(httpServer, client, subscriber);
  await initializeDependencies({ models: [urlModel] });
};
