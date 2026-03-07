import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Container from 'typedi';
import { AppLogger } from '../services/logger/app-logger';
import { Redis } from '../redis';

/**
 * DI token for the Socket.io server instance.
 */
export const SOCKET_IO_SERVER = 'SocketIOServer';

/**
 * Creates the Socket.io server, attaches it to the HTTP server,
 * wires the Redis adapter for multi-instance pub/sub,
 * and registers the io instance in the DI container.
 *
 * Must be called AFTER:
 *   - loaders/redis.ts  (Redis clients must be in container)
 *   - loaders/fastify.ts (httpServer must exist)
 *
 * @param httpServer - HTTP server instance to attach Socket.io to
 * @param pubClient - Redis client for publishing messages
 * @param subClient - Redis subscriber client for receiving messages (must be separate connection)
 * @param logger - AppLogger instance
 */
export async function initSocketIO(
  httpServer: HttpServer,
  pubClient: Redis,
  subClient: Redis,
  logger: AppLogger
): Promise<SocketIOServer> {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Attach Redis adapter with separate pub/sub clients
  // Socket.io requires two distinct Redis connections: one for publishing, one for subscribing
  try {
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.io Redis adapter attached with pub/sub clients');
  } catch (err) {
    logger.warn('Socket.io Redis adapter failed — single-instance mode active', {
      data: err,
    });
  }

  // Register io in DI container so SocketService can inject it
  Container.set(SOCKET_IO_SERVER, io);

  // Base connection lifecycle logging
  io.on('connection', (socket) => {
    logger.debug('Socket connected', { data: { socketId: socket.id } });

    socket.on('subscribe', (shortCode: string) => {
      if (typeof shortCode === 'string' && /^[a-zA-Z0-9-]{3,30}$/.test(shortCode)) {
        socket.join(`stats_${shortCode}`);
        logger.debug('Socket subscribed', { data: { socketId: socket.id, shortCode } });
      }
    });

    socket.on('unsubscribe', (shortCode: string) => {
      socket.leave(`stats_${shortCode}`);
    });

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { data: { socketId: socket.id } });
    });
  });

  logger.info('Socket.io loader complete — server registered in DI container');
  return io;
}
