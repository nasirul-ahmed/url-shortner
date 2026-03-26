import { FastifyInstance, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { Container } from 'typedi';
import { AuthService } from '../services/auth.service';
import { IUser } from '../interfaces';
import { extractTokenFromHeader } from '../utils/helper';
import { UserRole } from '../interfaces/user.interfaces';
import { AppLogger } from '../services/logger';

/*
/* custom auth hooks to authenticate & attaching user to the req 
*/
const decorateAuthMiddleware = async (fastify: FastifyInstance, logger: AppLogger) => {
  const authService = Container.get(AuthService);

  fastify.decorateRequest('user', null);

  const authenticate: preHandlerHookHandler = async (request, reply) => {
    try {
      // logger.info(`===> ${request.url} ===`, { data: request.body as any });
      const token = extractTokenFromHeader(request);

      // logger.debug('Auth decorator', { data: { token, headers: request.headers } });

      if (!token) {
        return reply.code(401).send({ message: 'Authorization token required' });
      }

      const decoded = await authService.verifyToken(token);

      if (!decoded) {
        return reply.code(401).send({ message: 'Invalid or expired token' });
      }
      request.user = decoded as IUser;
    } catch (err) {
      logger.error(err.message || 'Invalid or expired token', { context: 'decorateAuthMiddleware', error: err });
      request.log.error(err);
      return reply.code(401).send({ message: 'Invalid or expired token' });
    }
  };

  // RBAC Hook Factory - supports both single role and array of roles
  const checkRole = (roles: UserRole | UserRole[]): preHandlerHookHandler => {
    return async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ message: 'Authentication required' });
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles];

      if (!allowedRoles.includes(request.user.role)) {
        return reply.code(403).send({ message: 'Forbidden: Insufficient permissions' });
      }
    };
  };

  // Apply Decorators
  fastify.decorate('authenticate', authenticate);
  fastify.decorate('checkRole', checkRole);
};

export { decorateAuthMiddleware };
