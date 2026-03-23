import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUser, UserRole } from '../interfaces';

export interface IUserModel extends Omit<IUser, '_id'>, Document {}

const UserSchema = new Schema<IUserModel>(
  {
    email: { type: String, required: true, unique: true, trim: true, index: true },
    username: { type: String, required: true, unique: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: Object.values(UserRole), default: UserRole.USER },
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
    toJSON: {
      transform: (doc, ret) => {
        ret['id'] = ret._id.toString();
        delete ret.passwordHash;
        delete ret.emailVerifyToken;
        delete ret.resetPasswordTokenHash;
        delete ret.loginAttempts;
        delete ret.lockUntil;
        return ret;
      },
    },
  },
);

export const UserModel: Model<IUserModel> = mongoose.model<IUserModel>('User', UserSchema);
