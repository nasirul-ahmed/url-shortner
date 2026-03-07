export interface IApiResponse<T = unknown> {
  status: number; // Maps to ErrorCode enum
  message: string;
  data?: T;
  error?: unknown;
}

export interface IShortenRequestBody {
  longUrl: string;
  customAlias?: string;
  expiresAt?: string; // ISO 8601 string — transformed to Date by Zod
}

export interface IPaginationOptions {
  page: number;
  limit: number;
}

/** Wraps a paginated list response. */
export interface IPaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IRequestContext {
  ip: string;
  userAgent: string;
  headers: Record<string, string | string[] | undefined>;
}
