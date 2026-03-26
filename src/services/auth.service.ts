import { Inject, Service } from 'typedi';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { AppLogger } from './logger/app-logger';
import { UserModel } from '../models/user.model';
import { ErrorCodes, ErrorMessages } from '../errors/errorCodes';
import { AppError } from '../errors/AppError';
import { IUser } from '../interfaces';
import { SessionService } from './session.service';
import { Queue } from 'bullmq';
import { JobIdEnums } from '../loaders/worker';

const BCRYPT_SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 30 * 60 * 1000; // 30 minutes

@Service()
export class AuthService {
  constructor(
    private readonly logger: AppLogger,
    private readonly sessionService: SessionService,
    @Inject('shorturl-queue') private queue: Queue,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private signJwt(payload: any, expiresIn: string): string {
    return jwt.sign(payload, config.auth.jwtSecret, { expiresIn });
  }

  public async register(payload: { email: string; username: string; password: string }) {
    const existing = await UserModel.findOne({ $or: [{ email: payload.email }, { username: payload.username }] });
    if (existing) {
      throw new AppError({ code: ErrorCodes.BAD_REQUEST, message: 'Email or username already exists' });
    }

    const passwordHash = await bcrypt.hash(payload.password, BCRYPT_SALT_ROUNDS);
    const emailVerifyToken = crypto.randomBytes(24).toString('hex');

    const user = await UserModel.create({
      email: payload.email.toLowerCase(),
      username: payload.username,
      passwordHash,
      role: 'USER',
      emailVerified: false,
      emailVerifyToken,
      emailVerifyTokenExpiresAt: new Date(Date.now() + config.auth.emailVerificationTokenExpirySeconds * 1000),
      disabled: false,
      loginAttempts: 0,
    });

    console.log({ user: user.toJSON() });

    if (user._id) {
      const queueData = {
        to: user.email,
        subject: 'Welcome!',
        template: 'welcome',
        variables: {
          name: user.username || payload.username,
          verifyUrl: `http://localhost:3000/auth/verify-email/${emailVerifyToken}`,
        },
      };

      await this.queue.add(JobIdEnums.SEND_WELCOME_EMAIL, queueData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });

      this.logger.info('Queued a new ==== welcome email ==== with', { data: queueData });
    }

    this.logger.info('New user registered', { data: { userId: user._id.toString() } });
    return { userId: user._id.toString(), email: user.email, username: user.username };
  }

  public async verifyEmail(token: string) {
    const user = await UserModel.findOne({
      emailVerifyToken: token,
    });

    if (!user) {
      throw new AppError({ code: ErrorCodes.NOT_FOUND, message: 'User not found' });
    }

    // emailVerifyTokenExpiresAt: { $gt: new Date() },
    if (user.emailVerifyTokenExpiresAt < new Date()) {
      throw new AppError({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid or expired verification token' });
    }

    user.emailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyTokenExpiresAt = undefined;
    await user.save();

    return { success: true, ...user };
  }

  public async login(payload: { email: string; password: string; ip?: string; device?: string }) {
    const user = await UserModel.findOne({ email: payload.email.toLowerCase() });
    if (!user) {
      throw new AppError({ code: ErrorCodes.UNAUTHORIZED, message: 'Invalid email or password' });
    }

    if (user.disabled) {
      throw new AppError({ code: ErrorCodes.FORBIDDEN, message: 'Account is disabled' });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new AppError({ code: ErrorCodes.FORBIDDEN, message: 'Account temporarily locked due to failed logins' });
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
      }
      await user.save();
      throw new AppError({ code: ErrorCodes.UNAUTHORIZED, message: ErrorMessages[ErrorCodes.UNAUTHORIZED] });
    }

    // successful login reset counters
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    await user.save();

    // require verified email for non-admin
    if (!user.emailVerified) {
      throw new AppError({ code: ErrorCodes.FORBIDDEN, message: 'Email not verified' });
    }

    const accessToken = this.signJwt(
      { sub: user._id.toString(), role: user.role, email: user.email },
      config.auth.jwtExpiresIn,
    );

    const refreshToken = this.signJwt(
      { sub: user._id.toString(), role: user.role, type: 'refresh' },
      config.auth.refreshTokenExpiresIn,
    );

    // Create session for refresh token tracking
    const sessionId = await this.sessionService.createSession({
      userId: user._id.toString(),
      refreshToken,
      userAgent: payload.device,
      ipAddress: payload.ip,
      expirySeconds: this.parseExpirySeconds(config.auth.refreshTokenExpiresIn),
    });

    this.logger.info('User login successful', {
      data: { userId: user._id, ip: payload.ip, device: payload.device, sessionId },
    });

    return {
      accessToken,
      refreshToken, // Will be set as HttpOnly cookie in controller
      sessionId,
      expiresIn: config.auth.jwtExpiresIn,
      refreshExpiresIn: config.auth.refreshTokenExpiresIn,
    };
  }

  public async forgotPassword(email: string) {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return { message: 'If this email exists, reset instructions were sent' };
    }

    const token = crypto.randomBytes(24).toString('hex');
    user.resetPasswordTokenHash = this.hashToken(token);
    user.resetPasswordExpiresAt = new Date(Date.now() + config.auth.resetPasswordTokenExpirySeconds * 1000);

    await user.save();

    const queueData = {
      to: user.email,
      subject: 'ShortCode - Password Reset',
      template: 'reset-password',
      variables: {
        resetUrl: `${config.app.baseUrl}/auth/forgot-password`,
        expires: user.resetPasswordExpiresAt,
      },
    };

    await this.queue.add(JobIdEnums.SEND_FORGOT_PASSWORD, queueData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });

    this.logger.info('Password reset requested', { data: { userId: user._id } });

    return { message: 'If this email exists, reset instructions were sent' };
  }

  public async resetPassword(token: string, newPassword: string) {
    const tokenHash = this.hashToken(token);
    const user = await UserModel.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      throw new AppError({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid or expired password reset token' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpiresAt = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    this.logger.info('Password reset completed', { data: { userId: user._id } });

    return { message: 'Password has been reset' };
  }

  public async disableUser(userId: string, reason: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new AppError({ code: ErrorCodes.NOT_FOUND, message: 'User not found' });
    }

    user.disabled = true;
    await user.save();

    this.logger.info('User disabled by admin', { data: { userId, reason } });
    return { success: true, reason };
  }

  public async refreshToken(existingRefreshToken: string, sessionId: string, userAgent?: string, ipAddress?: string) {
    try {
      const payload = jwt.verify(existingRefreshToken, config.auth.jwtSecret) as {
        sub: string;
        role: string;
        type: string;
      };

      if (payload.type !== 'refresh') {
        throw new Error('Token type invalid');
      }

      // Verify session exists and is valid
      const session = await this.sessionService.verifyRefreshToken(
        payload.sub,
        existingRefreshToken,
        userAgent,
        ipAddress,
      );

      if (!session) {
        throw new AppError({
          code: ErrorCodes.UNAUTHORIZED,
          message: 'Invalid or expired session',
        });
      }

      const user = await UserModel.findById(payload.sub);
      if (!user || user.disabled) {
        throw new AppError({ code: ErrorCodes.UNAUTHORIZED, message: 'Invalid user session' });
      }

      // Generate new tokens (rotation)
      const newAccessToken = this.signJwt(
        { sub: user._id.toString(), role: user.role, email: user.email },
        config.auth.jwtExpiresIn,
      );
      const newRefreshToken = this.signJwt(
        { sub: user._id.toString(), role: user.role, type: 'refresh' },
        config.auth.refreshTokenExpiresIn,
      );

      // Rotate token in session
      await this.sessionService.rotateToken(
        session._id.toString(),
        newRefreshToken,
        this.parseExpirySeconds(config.auth.refreshTokenExpiresIn),
      );

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        sessionId: session._id.toString(),
        expiresIn: config.auth.jwtExpiresIn,
        refreshExpiresIn: config.auth.refreshTokenExpiresIn,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Refresh token invalid or expired',
      });
    }
  }

  public async verifyToken(token: string): Promise<IUser | null> {
    try {
      const payload = jwt.verify(token, config.auth.jwtSecret) as { sub: string; role: string; type?: string };

      // Don't allow refresh tokens for auth verification
      if (payload.type === 'refresh') {
        return null;
      }

      const user = await UserModel.findById(payload.sub);

      if (!user || user.disabled) {
        throw new AppError({ code: ErrorCodes.NOT_FOUND, message: 'User not found or disabled' });
      }

      const returnData = user.toJSON() as unknown as IUser;

      return returnData;
    } catch (err) {
      throw new AppError({ code: ErrorCodes.NOT_FOUND, message: 'User not found or disabled' });
    }
  }

  /**
   * Logout user - invalidate session
   */
  public async logout(sessionId: string, userId: string): Promise<void> {
    try {
      await this.sessionService.invalidateSession(sessionId);
      this.logger.info('User logged out', { data: { userId, sessionId } });
    } catch (error) {
      this.logger.error('Logout failed', error);
      throw new AppError({
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Logout failed',
      });
    }
  }

  /**
   * Logout all devices - invalidate all sessions for user
   */
  public async logoutAll(userId: string): Promise<void> {
    try {
      await this.sessionService.invalidateAllUserSessions(userId);
      this.logger.info('User logged out from all devices', { data: { userId } });
    } catch (error) {
      this.logger.error('Logout all failed', error);
      throw new AppError({
        code: ErrorCodes.INTERNAL_SERVER_ERROR,
        message: 'Logout all failed',
      });
    }
  }

  /**
   * Get user active sessions
   */
  public async getUserSessions(userId: string) {
    return this.sessionService.getUserActiveSessions(userId);
  }

  /**
   * Parse JWT expiry duration string (e.g., "7d", "15m") to seconds
   */
  private parseExpirySeconds(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error('Invalid duration format');

    const [, value, unit] = match;
    const numValue = parseInt(value, 10);

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 24 * 60 * 60,
    };

    return numValue * (multipliers[unit] || 1);
  }
}
