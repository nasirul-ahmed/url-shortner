import 'reflect-metadata';
import path from 'path';
/**
 * Central configuration module - reads from environment variables
 * with sensible production defaults.
 */
export const config = {
  logs: {
    level: process.env.LOG_LEVEL || 'info',
  },
  app: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    apiPrefix: process.env.API_PREFIX || '/api/v1',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    instanceId: process.env.INSTANCE_ID || `instance-${process.pid}`,
  },

  redis: {
    redisUrl: process.env.REDIS_URL,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    ttl: {
      urlMapping: 60 * 60 * 24, // 24 hours
      analyticsWindow: 60, // 60 seconds sliding window
      rateLimitWindow: 60, // 1 minute rate limit
    },
    keyPrefix: {
      url: 'url:',
      clicksTotal: 'analytics:clicks:',
      clicksWindow: 'analytics:window:',
      country: 'analytics:country:',
      device: 'analytics:device:',
      alias: 'alias:lock:',
    },
  },

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/url-shortener',
    options: {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: '1 minute',
  },

  shortCode: {
    length: 8,
    charset: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'change-me-super-secret',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.REFRESH_EXPIRES_IN || '7d',
    refreshTokenRollIntervalSeconds: 60 * 60 * 24, // rotate every day
    emailVerificationTokenExpirySeconds: 60 * 60 * 24,
    resetPasswordTokenExpirySeconds: 60 * 60,
  },
  mailer: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE || false,
    username: process.env.SMTP_USERNAME || 'nasirulahmed44@gmail.com',
    password: process.env.SMTP_PASSWORD || 'abcd cdef efgh ijkl',
    fromAddress: process.env.SMTP_FROM_ADDRESS || 'nasirulahmed44@gmail.com',
  },
} as const;

export type Config = typeof config;
export const TEMPLATE_DIR = path.join(process.cwd(), 'src', 'templates');
