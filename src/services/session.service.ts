import { Service } from 'typedi';
import crypto from 'crypto';
import { SessionModel } from '../models/session.model';
import { AppLogger } from './logger/app-logger';
import { ISessionPayload, ISession } from '../interfaces/session.interfaces';
import { AppError } from '../errors/AppError';
import { ErrorCodes } from '../errors/errorCodes';

@Service()
export class SessionService {
  constructor(private readonly logger: AppLogger) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private createDeviceFingerprint(userAgent?: string, ipAddress?: string): string {
    const fingerprint = `${userAgent}:${ipAddress}`;
    return crypto.createHash('sha256').update(fingerprint).digest('hex');
  }

  async createSession(payload: ISessionPayload): Promise<string> {
    const tokenHash = this.hashToken(payload.refreshToken);
    const deviceFingerprint = this.createDeviceFingerprint(payload.userAgent, payload.ipAddress);

    try {
      // Invalidate old sessions on same device (optional: one device one session)
      // Uncomment to enforce single session per device:
      // await SessionModel.updateMany(
      //   { userId: payload.userId, deviceFingerprint },
      //   { isActive: false }
      // );

      const session = await SessionModel.create({
        userId: payload.userId,
        refreshTokenHash: tokenHash,
        deviceFingerprint,
        userAgent: payload.userAgent,
        ipAddress: payload.ipAddress,
        isActive: true,
        expiresAt: new Date(Date.now() + payload.expirySeconds * 1000),
      });

      this.logger.info('Session created', {
        data: { userId: payload.userId, sessionId: session._id },
      });

      return session._id.toString();
    } catch (error) {
      this.logger.error('Failed to create session', error);
      throw new AppError({
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Failed to create session',
      });
    }
  }

  /**
   * Verify refresh token against stored session
   */
  async verifyRefreshToken(
    userId: string,
    refreshToken: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<ISession | null> {
    try {
      const tokenHash = this.hashToken(refreshToken);
      const deviceFingerprint = this.createDeviceFingerprint(userAgent, ipAddress);

      const session = await SessionModel.findOne({
        userId,
        refreshTokenHash: tokenHash,
        deviceFingerprint,
        isActive: true,
        expiresAt: { $gt: new Date() },
      });

      if (!session) {
        this.logger.warn('Invalid refresh token attempt', { data: { userId } });
        return null;
      }

      // Convert to ISession interface
      return {
        _id: session._id.toString(),
        userId: session.userId,
        refreshTokenHash: session.refreshTokenHash,
        deviceFingerprint: session.deviceFingerprint,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        isActive: session.isActive,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      };
    } catch (error) {
      this.logger.error('Failed to verify refresh token', error);
      return null;
    }
  }

  /**
   * Invalidate all sessions for a user (logout all devices)
   */
  async invalidateAllUserSessions(userId: string): Promise<void> {
    try {
      await SessionModel.updateMany({ userId, isActive: true }, { isActive: false });
      this.logger.info('All user sessions invalidated', { data: { userId } });
    } catch (error) {
      this.logger.error('Failed to invalidate user sessions', error);
      throw error;
    }
  }

  /**
   * Invalidate specific session
   */
  async invalidateSession(sessionId: string): Promise<void> {
    try {
      await SessionModel.findByIdAndUpdate(sessionId, { isActive: false });
      this.logger.info('Session invalidated', { data: { sessionId } });
    } catch (error) {
      this.logger.error('Failed to invalidate session', error);
      throw error;
    }
  }

  /**
   * Get active sessions for a user
   */
  async getUserActiveSessions(userId: string): Promise<ISession[]> {
    try {
      const sessions = await SessionModel.find({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() },
      }).select('-refreshTokenHash');

      // Convert to ISession interface
      return sessions.map((session) => ({
        _id: session._id.toString(),
        userId: session.userId,
        refreshTokenHash: session.refreshTokenHash,
        deviceFingerprint: session.deviceFingerprint,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        isActive: session.isActive,
        expiresAt: session.expiresAt,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      }));
    } catch (error) {
      this.logger.error('Failed to get user sessions', error);
      return [];
    }
  }

  /**
   * Rotate refresh token (invalidate old, create new)
   */
  async rotateToken(sessionId: string, newRefreshToken: string, expirySeconds: number): Promise<void> {
    try {
      const newTokenHash = this.hashToken(newRefreshToken);

      await SessionModel.findByIdAndUpdate(sessionId, {
        refreshTokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + expirySeconds * 1000),
      });

      this.logger.info('Token rotated', { data: { sessionId } });
    } catch (error) {
      this.logger.error('Failed to rotate token', error);
      throw error;
    }
  }
}
