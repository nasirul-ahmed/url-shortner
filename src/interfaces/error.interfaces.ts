import { StatusCodes } from 'http-status-codes';

// Error interfaces

export interface IAppErrorOptions {
  code: number;
  details?: unknown;
  message?: string;
}
