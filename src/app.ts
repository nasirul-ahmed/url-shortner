import 'reflect-metadata';
import { config } from './config';
import { closeMongoDB } from './loaders/mongoose';
import { createApp } from './loaders/fastify';
import { AppLogger } from './services/logger';

async function bootstrap(): Promise<void> {
  const logger: AppLogger = new AppLogger();

  console.log('config', { data: config });
  const { fastify, httpServer } = await createApp(logger);

  // Register all routes BEFORE starting the server
  await require('./loaders').default({ fastify, httpServer, logger });

  // Now start the server after all routes are registered
  await fastify.ready();
  
  try {
    await httpServer.listen({ port: config.app.port, host: '0.0.0.0' });
    logger.info(`Server is listening on port ${config.app.port}`, {
      data: {
        baseUrl: config.app.baseUrl,
      },
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully...`);

    httpServer.close(async () => {
      try {
        await fastify.close();
        await closeMongoDB();

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
    logger.error('Uncaught exception', { data: { err } });
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
