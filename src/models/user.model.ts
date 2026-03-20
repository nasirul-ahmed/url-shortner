import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUser } from '../interfaces';

export interface IUserModel extends Omit<IUser, '_id'>, Document {}

const UserSchema = new Schema<IUserModel>(
  {
    email: { type: String, required: true, unique: true, trim: true, index: true },
    username: { type: String, required: true, unique: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['USER', 'ADMIN'], default: 'USER' },
    emailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, default: null },
    emailVerifyTokenExpiresAt: { type: Date, default: null },
    resetPasswordTokenHash: { type: String, default: null },
    resetPasswordExpiresAt: { type: Date, default: null },
    disabled: { type: Boolean, default: false },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const UserModel: Model<IUserModel> = mongoose.model<IUserModel>('User', UserSchema);
