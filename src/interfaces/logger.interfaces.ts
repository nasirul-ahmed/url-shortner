// Logger interfaces

export interface ILoggerPayload {
  readonly context?: string;
  readonly data?: Record<string, unknown>;
  readonly timeSpend?: number;
}

export interface IErrorLoggerPayload extends ILoggerPayload {
  readonly error?: Error | unknown;
}

export interface IAppLogger {
  info: (message: string, payload?: ILoggerPayload) => void;
  debug: (message: string, payload?: ILoggerPayload) => void;
  warn: (message: string, payload?: ILoggerPayload) => void;
  trace: (message: string, payload?: ILoggerPayload) => void;
  error: (message: string, payload?: IErrorLoggerPayload) => void;
  fatal: (message: string, payload?: IErrorLoggerPayload) => void;
}
