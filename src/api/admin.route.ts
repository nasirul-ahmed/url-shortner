import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Container } from 'typedi';
import { UserRole } from '../interfaces/user.interfaces';
import { AuthService } from '../services/auth.service';

export default async function (fastify: FastifyInstance) {
  const authService = Container.get(AuthService);

  fastify.post(
    '/admin/users/:userId/disable',
    {
      preHandler: [fastify.authenticate, fastify.checkRole([UserRole.ADMIN])],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { userId } = request.params as { userId?: string };
      if (!userId) {
        reply.status(400).send({ message: 'Missing userId' });
        return;
      }

      const body = request.body as { reason?: string };
      const result = await authService.disableUser(userId, body.reason ?? 'No reason provided');

      return result;
    },
  );
}
