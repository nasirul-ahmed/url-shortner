import { StatusCodes } from 'http-status-codes';

export interface IAppErrorOptions {
  code: number;
  details?: unknown;
  message?: string;
}
