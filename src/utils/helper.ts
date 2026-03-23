import { FastifyRequest } from 'fastify';

interface ISensitiveMap extends Record<string, string> {}

const blurProperty = (d: any): string => '***';

const isStream = (st: any): boolean => st !== null && typeof st === 'object' && typeof st.pipe === 'function';

const hideSensitive = (data: unknown, sensitiveMap: ISensitiveMap, depth = 0, maxDepth = 2): unknown => {
  if (depth >= maxDepth) return `max depth exceeded, depth: ${depth}`;
  if (data?.['acceptsEncodings']) return '[Request]';
  if (data?.['sendStatus']) return '[Response]';
  if (Buffer.isBuffer(data)) return '[Buffer]';
  if (isStream(data)) return '[Stream]';
  if (typeof data !== 'object' || data === null) return data as unknown;
  if (Array.isArray(data)) return data?.map((item) => hideSensitive(item, sensitiveMap, depth + 1, maxDepth));

  return Object.entries(data).reduce((acc, [key, value]) => {
    if (typeof value === 'object' && !(value instanceof Date)) {
      if (sensitiveMap[key.trim()?.toLocaleLowerCase()]) {
        return { ...acc, [key]: value ? blurProperty(value) : value };
      }

      return { ...acc, [key]: hideSensitive(value, sensitiveMap, depth + 1, maxDepth) };
    }

    if (sensitiveMap[key.trim()?.toLocaleLowerCase()]) {
      return { ...acc, [key]: value ? blurProperty(value as string) : value };
    }

    return { ...acc, [key]: value };
  }, {});
};

export const removeSensitiveData = (data: unknown, sensitive: string[], maxDepth: number): unknown => {
  const sensitiveMap: ISensitiveMap = sensitive.reduce(
    (acc, key) => ({
      ...acc,
      [key.trim()?.toLocaleLowerCase()]: '***',
    }),
    {},
  );

  return hideSensitive(data, sensitiveMap, 0, maxDepth);
};

export const convertToPlainObject = (data: any) =>
  Object.getOwnPropertyNames(data).reduce((acc, curr) => ({ ...acc, [curr]: data[curr] }), {});

export const timer = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate consistent room name for stats subscriptions
 */
export const getStatsRoom = (shortCode: string): string => `stats_${shortCode}`;

/**
 * Extracts token from request headers
 */
export const extractTokenFromHeader = (req: FastifyRequest): string | null => {
  if (
    (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Token') ||
    (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer')
  ) {
    return req.headers.authorization.split(' ')[1];
  }

  if ((req.query as any)?.token) {
    return (req.query as any).token;
  }

  return null;
};

export const parseMaxAge = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 604800; // Default 7 days

  const [, value, unit] = match;
  const numValue = parseInt(value, 10);

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  };

  return numValue * (multipliers[unit] || 1);
};

import { Types } from 'mongoose';

export const convertToObjectId = (data) => {
  return new Types.ObjectId(data);
};
