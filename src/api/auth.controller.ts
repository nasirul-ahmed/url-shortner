import { Service } from 'typedi';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/auth.service';
import { AppLogger } from '../services/logger';

@Service()
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly logger: AppLogger) {}

  async register(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as { email?: string; username?: string; password?: string };

    if (!body.email || !body.username || !body.password) {
      reply.status(400).send({ message: 'Missing required fields' });
      return;
    }

    const result = await this.authService.register({
      email: body.email,
      username: body.username,
      password: body.password,
    });

    reply.status(201).send(result);
  }

  async verifyEmail(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as { token?: string };

    if (!body.token) {
      reply.status(400).send({ message: 'Missing token' });
      return;
    }

    const result = await this.authService.verifyEmail(body.token);
    reply.send(result);
  }

  async login(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as { email?: string; password?: string; device?: string };
    if (!body.email || !body.password) {
      reply.status(400).send({ message: 'Missing email or password' });
      return;
    }

    const result = await this.authService.login({
      email: body.email,
      password: body.password,
      ip: request.ip,
      device: body.device || request.headers['user-agent']?.toString(),
    });

    reply.send(result);
  }

  async refresh(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as { refreshToken?: string };
    if (!body.refreshToken) {
      reply.status(400).send({ message: 'Missing refreshToken' });
      return;
    }

    const result = await this.authService.refreshToken(body.refreshToken);
    reply.send(result);
  }

  async forgotPassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as { email?: string };
    if (!body.email) {
      reply.status(400).send({ message: 'Missing email' });
      return;
    }

    const result = await this.authService.forgotPassword(body.email);
    reply.send(result);
  }

  async resetPassword(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const body = request.body as { token?: string; newPassword?: string };
    if (!body.token || !body.newPassword) {
      reply.status(400).send({ message: 'Missing token or newPassword' });
      return;
    }

    const result = await this.authService.resetPassword(body.token, body.newPassword);
    reply.send(result);
  }

  // admin route
  async disableUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const { userId } = request.params as { userId?: string };
    if (!userId) {
      reply.status(400).send({ message: 'Missing userId' });
      return;
    }

    const body = request.body as { reason?: string };
    const result = await this.authService.disableUser(userId, body.reason ?? 'No reason provided');
    reply.send(result);
  }
}
