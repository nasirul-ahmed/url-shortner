import { StatusCodes } from 'http-status-codes';
import { IAppErrorOptions } from '../interfaces/error.interfaces';
import { ErrorCodes } from './errorCodes';

export class AppError extends Error {
  code: number;
  statusCode: StatusCodes = StatusCodes.INTERNAL_SERVER_ERROR;
  details?: unknown;

  constructor(options: IAppErrorOptions, statusCode?: StatusCodes) {
    super(options.message);

    this.code = options.code;
    this.details = options.details;

    if (statusCode) {
      this.statusCode = statusCode;
    } else {
      // Auto-map based on your ranges
      if (this.code === ErrorCodes.NOT_FOUND || this.code === ErrorCodes.URL_EXPIRED) {
        this.statusCode = StatusCodes.NOT_FOUND;
      } else if (this.code === ErrorCodes.UNAUTHORIZED) {
        this.statusCode = StatusCodes.UNAUTHORIZED;
      } else {
        this.statusCode = StatusCodes.BAD_REQUEST;
      }
    }
  }
}
