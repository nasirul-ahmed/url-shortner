import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}
