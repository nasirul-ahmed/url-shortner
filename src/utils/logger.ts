import pino from 'pino';
import { config } from '../config';

const isProd = config.app.nodeEnv === 'production';

const transport = !isProd
  ? pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    })
  : undefined;

const log = pino(
  {
    level: isProd ? 'info' : 'debug',
    timestamp: pino.stdTimeFunctions.isoTime,

    serializers: {
      err: pino.stdSerializers.err,
    },

    redact: {
      paths: ['req.headers.authorization', 'password', 'token'],
      censor: '***',
    },
  },
  transport,
);

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) =>
    log.info(meta || {}, message),

  warn: (message: string, meta?: Record<string, unknown>) =>
    log.warn(meta || {}, message),

  error: (
    message: string,
    error?: unknown,
    meta?: Record<string, unknown>
  ) => {
    log.error(
      {
        ...meta,
        err:
          error instanceof Error
            ? error
            : { message: String(error) },
      },
      message
    )
  },

  debug: (message: string, meta?: Record<string, unknown>) =>
    log.debug(meta || {}, message),

  redis: (message: string, meta?: Record<string, unknown>) =>
    log.warn(
      {
        ...meta,
        component: 'redis',
      },
      message
    ),

  db: (message: string, meta?: Record<string, unknown>) =>
    log.warn(
      {
        ...meta,
        component: 'database',
      },
      message
    ),
}
