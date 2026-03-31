import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Container from 'typedi';
import { AppLogger } from '../services/logger/app-logger';
import { Redis } from '../redis';
import eventHandler from '../socketEventHandler/eventHandler';

/**
 * DI token for the Socket.io server instance.
 */
export const SOCKET_IO_SERVER = 'SocketIOServer';

/**
 * Creates and configures the Socket.IO server with Redis adapter.
 * Delegates event handling to specialized handlers via the handler pattern.
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
  logger: AppLogger,
): Promise<SocketIOServer> {
  // Simple connection tracking (use Redis for multi-instance deployments)
  const connectionCounts = new Map<string, number>();
  const maxConnectionsPerIP = parseInt(process.env.MAX_CONNECTIONS_PER_IP || '50');

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:4000',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    perMessageDeflate: true, // Enable compression for better performance
    // allowRequest: (req, fn) => {
    //   // Basic connection limiting
    //   const clientIP = req.socket?.remoteAddress || 'unknown';
    //   const currentCount = connectionCounts.get(clientIP) || 0;

    //   if (currentCount >= maxConnectionsPerIP) {
    //     logger.warn('Connection limit exceeded', { data: { ip: clientIP, count: currentCount } });
    //     return fn('Connection limit exceeded', false);
    //   }

    //   connectionCounts.set(clientIP, currentCount + 1);
    //   fn(null, true);
    // },
  });

  // Track disconnections to decrement counters
  io.on('connection', (socket) => {
    socket.on('disconnect', () => {
      const clientIP = socket.handshake.address;
      const currentCount = connectionCounts.get(clientIP) || 0;
      if (currentCount > 0) {
        connectionCounts.set(clientIP, currentCount - 1);
      }
    });
  });

  // Attach Redis adapter for multi-instance support
  try {
    io.adapter(createAdapter(pubClient, subClient));
    logger.info('Socket.io Redis adapter attached');
  } catch (err) {
    logger.warn('Socket.io Redis adapter failed — single-instance mode active', {
      data: err,
    });
  }

  // Register io in DI container for service injection
  Container.set(SOCKET_IO_SERVER, io);

  // Register event handlers
  eventHandler(io, logger);

  logger.info('Socket.io configured with Redis adapter and event handlers');
  return io;
}
