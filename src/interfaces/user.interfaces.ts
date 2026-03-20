export interface IUser {
  _id?: string;
  email: string;
  username: string;
  passwordHash: string;
  role: 'USER' | 'ADMIN';
  emailVerified: boolean;
  emailVerifyToken?: string;
  emailVerifyTokenExpiresAt?: Date;
  resetPasswordTokenHash?: string;
  resetPasswordExpiresAt?: Date;
  disabled: boolean;
  loginAttempts: number;
  lockUntil?: Date;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
