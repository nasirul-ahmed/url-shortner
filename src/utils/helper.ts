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
