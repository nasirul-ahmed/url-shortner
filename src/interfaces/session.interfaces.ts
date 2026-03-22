export interface ISession {
  _id?: string;
  userId: string;
  refreshTokenHash: string; // SHA256 hash of actual refresh token (never store raw)
  deviceFingerprint: string; // User-Agent + IP hash for security
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  createdAt?: Date;
  expiresAt: Date; // TTL - when session expires
  updatedAt?: Date;
}

export interface ISessionPayload {
  userId: string;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  expirySeconds: number;
}

export interface IRefreshTokenPayload {
  accessToken: string;
  expiresIn: string;
  refreshExpiresIn: string;
}
