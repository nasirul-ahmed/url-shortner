import 'reflect-metadata';
import { config } from './config';
import { logger } from './utils/logger';
import { closeRedis } from './loaders/redis';
import { closeMongoDB } from './loaders/mongoose';
import { createApp } from './loaders/fastify';

async function bootstrap(): Promise<void> {
  const { fastify, httpServer } = await createApp();

  await require('./loaders').default({ fastify, httpServer });

  httpServer.listen(config.app.port, '0.0.0.0', () => {
    logger.info(`Server listening on port ${config.app.port}`, {
      baseUrl: config.app.baseUrl,
    });
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully...`);

    httpServer.close(async () => {
      try {
        await fastify.close();
        await closeMongoDB();
        await closeRedis();
        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error('Error during shutdown', err);
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 15_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', reason);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
