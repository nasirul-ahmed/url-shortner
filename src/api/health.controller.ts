import { FastifyReply, FastifyRequest } from 'fastify';

export async function health(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  return reply.code(200).send({ status: 'ok', timestamp: new Date().toISOString() });
}
