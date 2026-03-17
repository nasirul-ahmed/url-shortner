import 'reflect-metadata';
import cluster from 'cluster';
import os from 'os';
import { config } from './config';
import { closeMongoDB } from './loaders/mongoose';
import { createApp } from './loaders/fastify';
import { AppLogger } from './services/logger';

async function bootstrap(): Promise<void> {
  const logger: AppLogger = new AppLogger();
  const { fastify, httpServer } = await createApp(logger);

  await require('./loaders').default({ fastify, httpServer, logger });
  await fastify.ready();

  try {
    await fastify.listen({
      port: config.app.port,
      // host: 'localhost',
      host: '0.0.0.0'
    });
    logger.info(`Worker ${process.pid} is listening on port ${config.app.port}`, {
      data: {
        baseUrl: config.app.baseUrl,
      },
    });
  } catch (err) {
    console.error('Failed to start server', err);
    logger.error('Failed to start server', err);
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully...`);

    const forceExit = setTimeout(() => {
      logger.error('Forced shutdown after timeout — forcing exit');
      process.exit(1);
    }, 15_000);

    forceExit.unref();

    try {
      await fastify.close();
      await closeMongoDB();

      clearTimeout(forceExit);
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error('Error during shutdown', err);
      clearTimeout(forceExit);
      process.exit(1);
    }
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

const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

if (cluster.isPrimary && !isDev) {
  const numCPUs = os.cpus().length;
  const numWorkers = Math.max(1, numCPUs - 4);

  console.log(`Primary ${process.pid} is running — spawning ${numWorkers} workers`);

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died (signal: ${signal ?? 'none'}, code: ${code}) — restarting...`);
    cluster.fork();
  });

  cluster.on('online', (worker) => {
    console.log(`Worker ${worker.process.pid} is online`);
  });
} else {
  bootstrap().catch((err) => {
    console.error(`Worker ${process.pid} failed to start:`, err);
    process.exit(1);
  });
}

// bootstrap().catch((err) => {
//   console.error(`Worker ${process.pid} failed to start:`, err);
//   process.exit(1);
// });