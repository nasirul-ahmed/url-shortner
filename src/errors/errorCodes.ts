export enum ErrorCodes {
  OK = 1000,
  BAD_REQUEST = 4000,
  UNAUTHORIZED = 4001,
  FORBIDDEN = 4003,
  NOT_FOUND = 4004,
  INTERNAL_SERVER_ERROR = 5000,

  // URL Specific (41xx range)
  INVALID_URL = 4101,
  MALICIOUS_URL = 4102,
  URL_EXPIRED = 4103,
  ALIAS_ALREADY_EXISTS = 4104,
  BLACKLISTED_DOMAIN = 4105,
  INVALID_ALIAS = 4106,

  // Rate Limiting (42xx range)
  RATE_LIMIT_EXCEEDED = 4201,
  DAILY_QUOTA_REACHED = 4202,

  //DB
  DB_CONNECTION_ERROR = 5101, // DB is down or refused connection
  DB_DUPLICATE_KEY = 5102, // Unique constraint violation (e.g., duplicate ID)
  DB_VALIDATION_ERROR = 5103, // Schema validation failed at DB level
  DB_QUERY_FAILED = 5104, // Syntax error or malformed query
  DB_TRANSACTION_ERROR = 5105, // ACID transaction failed/aborted
  DB_RECORD_LOCKED = 5106, // Resource busy (Optimistic locking)
}

export const ErrorMessages = {
  // General
  [ErrorCodes.OK]: 'Success',
  [ErrorCodes.BAD_REQUEST]: 'The request could not be understood or was invalid.',
  [ErrorCodes.UNAUTHORIZED]: 'Authentication is required to access this resource.',
  [ErrorCodes.FORBIDDEN]: 'You do not have permission to perform this action.',
  [ErrorCodes.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorCodes.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred.',

  // URL Specific
  [ErrorCodes.INVALID_URL]: 'The provided string is not a valid URL.',
  [ErrorCodes.MALICIOUS_URL]: 'This URL has been flagged as potentially unsafe or malicious.',
  [ErrorCodes.URL_EXPIRED]: 'This link has expired and is no longer accessible.',
  [ErrorCodes.ALIAS_ALREADY_EXISTS]: 'The custom alias requested is already in use.',
  [ErrorCodes.BLACKLISTED_DOMAIN]: 'Shortening links from this domain is not permitted.',

  // Rate Limiting
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please slow down.',
  [ErrorCodes.DAILY_QUOTA_REACHED]: 'You have reached your daily limit for shortening links.',

  // DB
  [ErrorCodes.DB_CONNECTION_ERROR]: 'The database is currently unavailable. Please try again later.',
  [ErrorCodes.DB_DUPLICATE_KEY]: 'A record with this unique identifier already exists.',
  [ErrorCodes.DB_VALIDATION_ERROR]: 'The data provided does not meet database integrity requirements.',
  [ErrorCodes.DB_QUERY_FAILED]: 'An error occurred while processing your request in the database.',
  [ErrorCodes.DB_TRANSACTION_ERROR]: 'The operation could not be completed safely. Please retry.',
  [ErrorCodes.DB_RECORD_LOCKED]: 'The record is currently being updated by another process.',
} as const;
