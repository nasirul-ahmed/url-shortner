import { preHandlerHookHandler } from 'fastify';
import { IUser } from '../interfaces';

declare module 'fastify' {
  interface FastifyRequest {
    user: IUser | null;
  }

  interface FastifyInstance {
    authenticate: preHandlerHookHandler;
    checkRole(roles: string | string[]): preHandlerHookHandler;
  }
}
