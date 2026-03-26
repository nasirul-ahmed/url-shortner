import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Container } from 'typedi';
import { AuthService } from '../services/auth.service';
import { parseMaxAge } from '../utils/helper';
import { AppLogger } from '../services/logger';

export default async function (fastify: FastifyInstance) {
  const authService = Container.get(AuthService);
  const logger = Container.get(AppLogger);

  // Public Routes
  fastify.post('/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as { email?: string; username?: string; password?: string };

    if (!body.email || !body.username || !body.password) {
      reply.status(400).send({ message: 'Missing required fields' });
      return;
    }

    const result = await authService.register({
      email: body.email,
      username: body.username,
      password: body.password,
    });

    reply.status(201).send(result);
  });

  // verify email
  fastify.get('/auth/verify-email/:token', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token } = request.params as { token: string };
      const user = await authService.verifyEmail(token);

      console.log({ user });

      // on success send success
      return reply.view('email-verify-status.ejs', {
        status: 'success',
        title: 'Email Verified!',
        message: `Hi ${user.username}, your account is now active.`,
        btnText: 'Go to Dashboard',
        btnUrl: `http://localhost:3000/login`,
        subtext: 'You can now close this window.',
      });
    } catch (error) {
      // on ERROR or EXPIRED send view accordingly
      return reply.view('email-verify-status.ejs', {
        status: 'error',
        title: 'Link Expired',
        message: error?.message ?? 'The verification link is invalid or has already been used.',
        btnText: 'Resend Email',
        btnUrl: `http://localhost:3000/resend-verification`,
        subtext: 'Contact support if you continue to have issues.',
      });
    }
  });

  fastify.post('/auth/login', async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = request.body as { email?: string; password?: string; device?: string };
    if (!body.email || !body.password) {
      reply.status(400).send({ message: 'Missing email or password' });
      return;
    }

    const result = await authService.login({
      email: body.email,
      password: body.password,
      ip: request.ip,
      device: body.device || request.headers['user-agent']?.toString(),
    });

    // Set refresh token as HttpOnly cookie (secure, auto-managed by browser)
    reply.setCookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: true, // HTTPS only in production
      sameSite: 'strict',
      path: '/',
      maxAge: parseMaxAge(result.refreshExpiresIn),
    });

    // Return only access token in JSON (not refreshToken since it's in cookie)
    reply.status(200).send({
      accessToken: result.accessToken,
      sessionId: result.sessionId,
      expiresIn: result.expiresIn,
    });
  });

  fastify.post('/auth/forgot-password', async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = request.body as { email?: string };
    if (!body.email) {
      reply.status(400).send({ message: 'Missing email' });
      return;
    }

    const result = await authService.forgotPassword(body.email);
    reply.send(result);
  });

  fastify.post('/auth/reset-password', async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const body = request.body as { token?: string; newPassword?: string };
    if (!body.token || !body.newPassword) {
      reply.status(400).send({ message: 'Missing token or newPassword' });
      return;
    }

    const result = await authService.resetPassword(body.token, body.newPassword);
    reply.send(result);
  });

  // protected routes
  fastify.post(
    '/auth/refresh',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      logger.info('/auth/refresh called', { data: { ...(request.body as any), cookies: request.cookies } });

      const refreshToken = request.cookies.refreshToken;
      const sessionId = (request.body as any)?.sessionId;

      if (!refreshToken || !sessionId) {
        reply.status(400).send({ message: 'Missing refreshToken or sessionId' });
        return;
      }

      const result = await authService.refreshToken(
        refreshToken,
        sessionId,
        request.headers['user-agent']?.toString(),
        request.ip,
      );

      // Update HttpOnly cookie with new refresh token
      reply.setCookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        path: '/',
        maxAge: parseMaxAge(result.refreshExpiresIn),
      });

      // Return only access token in JSON
      reply.status(200).send({
        accessToken: result.accessToken,
        sessionId: result.sessionId,
        expiresIn: result.expiresIn,
      });
    },
  );

  // Get current authenticated user
  fastify.get(
    '/auth/me',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      logger.info('/auth/me ====> called ');
      reply.send(request.user);
    },
  );

  fastify.post(
    '/auth/logout',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (!request.user) {
        reply.status(401).send({ message: 'Not authenticated' });
        return;
      }

      const body = request.body as { sessionId?: string };
      if (!body.sessionId) {
        reply.status(400).send({ message: 'Missing sessionId' });
        return;
      }

      await authService.logout(body.sessionId, request.user._id!);

      // Clear refresh token cookie
      reply.clearCookie('refreshToken', { path: '/' });
      reply.status(200).send({ message: 'Logged out successfully' });
    },
  );

  fastify.post(
    '/auth/logout-all',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (!request.user) {
        reply.status(401).send({ message: 'Not authenticated' });
        return;
      }

      await authService.logoutAll(request.user._id!);

      // Clear refresh token cookie
      reply.clearCookie('refreshToken', { path: '/' });
      reply.status(200).send({ message: 'Logged out from all devices' });
    },
  );

  fastify.get(
    '/auth/sessions',
    { preHandler: [fastify.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (!request.user) {
        reply.status(401).send({ message: 'Not authenticated' });
        return;
      }

      const sessions = await authService.getUserSessions(request.user._id!);
      reply.status(200).send({
        sessions,
        count: sessions.length,
      });
    },
  );
}
