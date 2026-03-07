import pino, { Logger } from 'pino';
import { config } from '../../config';

export type PinoLogger = Logger;

export function buildPinoLogger(): PinoLogger {
  const pretty = {
    levelFirst: true,
    ignore: 'pid,hostname',
    translateTime: 'HH:MM:ss',
    colorize: false,
  };

  const logger = pino({
    level: config.logs.level,
    formatters: {
      level: (label) => ({ level: label }),
      bindings: () => ({}), // Remove default pid and hostname
    },
    timestamp: () => {
      const time = new Date().toISOString();
      return `,"time":"${time}"`;
    },
    transport: {
      target: 'pino-pretty',
      options: pretty,
    },
  });

  return logger;
}
