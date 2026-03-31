import pino, { Logger, transport } from 'pino';
import { config } from '../../config';

export type PinoLogger = Logger;

export function buildPinoLogger(): PinoLogger {
  const isProduction = process.env.NODE_ENV === 'production';

  const pretty = {
    levelFirst: true,
    ignore: 'pid,hostname',
    translateTime: 'HH:MM:ss',
    colorize: false,
  };

  const pinoConfig: any = {
    level: config.logs.level,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: () => ({}), // Remove default pid and hostname
    },
    timestamp: () => {
      const time = new Date().toISOString();
      return `,"time":"${time}"`;
    },
  };

  if (!isProduction) {
    pinoConfig.transport = {
      target: 'pino-pretty',
      options: pretty,
    };
  }

  const logger = pino(pinoConfig);

  return logger;
}
