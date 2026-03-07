import { customAlphabet } from 'nanoid';
import { config } from '../config';

const { charset, length } = config.shortCode;

/**
 * Generates a cryptographically random Base62 short code.
 * Using nanoid for collision-resistant IDs.
 */
const generateId = customAlphabet(charset, length);

export function generateShortCode(): string {
  return generateId();
}

/**
 * Validates that a URL is well-formed and uses http/https.
 * Guards against javascript:, data:, and other injection vectors.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Validates a custom alias: alphanumeric + hyphens, 3-30 chars.
 */
export function isValidAlias(alias: string): boolean {
  return /^[a-zA-Z0-9-]{3,30}$/.test(alias);
}

/**
 * Normalizes a URL: trims whitespace, ensures trailing slash consistency.
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

/**
 * Builds the full short URL from a short code.
 */
export function buildShortUrl(shortCode: string): string {
  return `${config.app.baseUrl}/${shortCode}`;
}
