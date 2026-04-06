import crypto from 'crypto';

/**
 * Generates a unique visitor identifier by hashing IP + User-Agent + salt.
 * This provides privacy compliance and better uniqueness than raw IPs.
 */
export function generateVisitorId(ip: string, userAgent: string): string {
  // Use a salt to prevent rainbow table attacks and add entropy
  const salt = process.env.VISITOR_ID_SALT || 'url-shortener-analytics-salt-2024';
  const hashInput = `${ip}:${userAgent}:${salt}`;

  // Use SHA-256 for strong hashing
  return crypto.createHash('sha256').update(hashInput).digest('hex');
}

/**
 * Alternative: Simpler hash for high-performance scenarios
 * Uses MD5 for speed (still sufficient for uniqueness, not security)
 */
export function generateVisitorIdFast(ip: string, userAgent: string): string {
  const salt = process.env.VISITOR_ID_SALT || 'ur1-5h0rtener-an6lytic5-sa1t-2o26';
  const hashInput = `${ip}:${userAgent}:${salt}`;

  return crypto.createHash('md5').update(hashInput).digest('hex');
}