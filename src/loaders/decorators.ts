import { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { Container } from 'typedi';
import { AuthService } from '../services/auth.service';
import { IUser } from '../interfaces';
import { extractTokenFromHeader } from '../utils/helper';

const decorateAuthMiddleware = async (fastify: FastifyInstance) => {
  const authService = Container.get(AuthService);

  fastify.decorateRequest('user', null);

  const authenticate: preHandlerHookHandler = async (request, reply) => {
    try {
      const token = extractTokenFromHeader(request);

      if (!token) {
        return reply.code(401).send({ message: 'Authorization token required' });
      }

      const decoded = await authService.verifyToken(token);
      request.user = decoded as IUser;
    } catch (err) {
      request.log.error(err);
      return reply.code(401).send({ message: 'Invalid or expired token' });
    }
  };

  // RBAC Hook Factory
  const checkRole = (role: string): preHandlerHookHandler => {
    return async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ message: 'Authentication required' });
      }

      if (role !== request.user.role) {
        return reply.code(403).send({ message: 'Forbidden: Insufficient permissions' });
      }
    };
  };

  // Apply Decorators
  fastify.decorate('authenticate', authenticate);
  fastify.decorate('checkRole', checkRole);
};

export { decorateAuthMiddleware };
