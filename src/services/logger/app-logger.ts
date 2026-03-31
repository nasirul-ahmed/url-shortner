import { time } from 'node:console';
import { config } from '../../config';
import { IAppLogger, IErrorLoggerPayload, ILoggerPayload } from '../../interfaces/logger.interfaces';
import { buildPinoLogger, PinoLogger } from './pino-logger';
import { removeSensitiveData } from '../../utils/helper';
import { sensitiveKeys } from './sensitiveKeys';
import { Service } from 'typedi';

@Service()
export class AppLogger implements IAppLogger {
  private readonly maxDepth: number;
  public logger: PinoLogger;

  constructor(maxDepth = 5) {
    this.maxDepth = maxDepth;
    const pinoLogger = buildPinoLogger();
    this.logger = pinoLogger.child({ level: config.logs.level });
  }

  public info(message: string, payload?: ILoggerPayload): void {
    this.logger.info(...this.prepare(message, payload));
  }

  public debug(message: string, payload?: ILoggerPayload): void {
    this.logger.info(...this.prepare(message, payload));
  }

  public trace(message: string, payload?: ILoggerPayload): void {
    this.logger.info(...this.prepare(message, payload));
  }

  public warn(message: string, payload?: ILoggerPayload): void {
    this.logger.info(...this.prepare(message, payload));
  }

  public error(message: string, payload?: IErrorLoggerPayload): void {
    this.logger.info(...this.prepare(message, payload));
  }

  public fatal(message: string, payload?: IErrorLoggerPayload): void {
    this.logger.info(...this.prepare(message, payload));
  }

  private prepare(message: string, payload: IErrorLoggerPayload): [any, string?, unknown?, unknown?] {
    const higherOrderLogs = {
      context: payload?.context,
      timeSpend: payload?.timeSpend,
    };

    if (!payload?.data && !payload?.error) {
      return [higherOrderLogs, message];
    }

    if (payload?.error) {
      const data = removeSensitiveData(payload.error, sensitiveKeys, this.maxDepth);
      return [higherOrderLogs, `${message}, payload: %j`, data];
    }

    const data = removeSensitiveData(payload.data, sensitiveKeys, this.maxDepth);
    return [higherOrderLogs, `${message}, payload: %j`, data];
  }
}
