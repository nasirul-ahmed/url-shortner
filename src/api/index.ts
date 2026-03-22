import { FastifyInstance } from 'fastify';
import healthRoute from './health.route';
import authRoute from './auth.route';
import urlRoute from './url.route';
import adminRoute from './admin.route';

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(healthRoute);
  await fastify.register(authRoute);
  await fastify.register(urlRoute);
  await fastify.register(adminRoute);
}
