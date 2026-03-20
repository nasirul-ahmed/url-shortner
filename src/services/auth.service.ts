import { Service } from 'typedi';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { config } from '../config';
import { AppLogger } from './logger/app-logger';
import { UserModel } from '../models/user.model';
import { ErrorCodes, ErrorMessages } from '../errors/errorCodes';
import { AppError } from '../errors/AppError';
import { IUser } from '../interfaces';

const BCRYPT_SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 30 * 60 * 1000; // 30 minutes

@Service()
export class AuthService {
  constructor(private readonly logger: AppLogger) {}

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

    // TODO: send email: sendVerificationEmail(user.email, emailVerifyToken)

    this.logger.info('New user registered', { data: { userId: user._id } });
    return { userId: user._id.toString(), email: user.email, username: user.username };
  }

  public async verifyEmail(token: string) {
    const user = await UserModel.findOne({
      emailVerifyToken: token,
      emailVerifyTokenExpiresAt: { $gt: new Date() },
    });
    if (!user) {
      throw new AppError({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid or expired verification token' });
    }

    user.emailVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyTokenExpiresAt = undefined;
    await user.save();

    return { success: true, email: user.email };
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

    // Optionally store refresh token hash in session collection + device info
    // Minimal for now.

    this.logger.info('User login successful', { data: { userId: user._id, ip: payload.ip, device: payload.device } });

    return { accessToken, refreshToken, expiresIn: config.auth.jwtExpiresIn, refreshExpiresIn: config.auth.refreshTokenExpiresIn };
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

    // TODO: send email with token link
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

  public async refreshToken(existingRefreshToken: string) {
    try {
      const payload = jwt.verify(existingRefreshToken, config.auth.jwtSecret) as { sub: string; role: string; type: string };

      if (payload.type !== 'refresh') {
        throw new Error('Token type invalid');
      }

      const user = await UserModel.findById(payload.sub);
      if (!user || user.disabled) {
        throw new AppError({ code: ErrorCodes.UNAUTHORIZED, message: 'Invalid user session' });
      }

      const accessToken = this.signJwt({ sub: user._id.toString(), role: user.role, email: user.email }, config.auth.jwtExpiresIn);
      const refreshToken = this.signJwt({ sub: user._id.toString(), role: user.role, type: 'refresh' }, config.auth.refreshTokenExpiresIn);

      return { accessToken, refreshToken, expiresIn: config.auth.jwtExpiresIn, refreshExpiresIn: config.auth.refreshTokenExpiresIn };
    } catch (err) {
      throw new AppError({ code: ErrorCodes.UNAUTHORIZED, message: 'Refresh token invalid or expired' });
    }
  }
}

