import mongoose, { Document, Schema, Model } from 'mongoose';
import { ISession } from '../interfaces/session.interfaces';

export interface ISessionModel extends Omit<ISession, '_id'>, Document {}

const SessionSchema = new Schema<ISessionModel>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true, // Prevent duplicate token hashes
      index: true,
    },
    deviceFingerprint: {
      type: String,
      required: true,
      index: true,
    },
    userAgent: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index - auto-delete expired sessions
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Index for finding active sessions by user
SessionSchema.index({ userId: 1, isActive: 1, expiresAt: 1 });

export const SessionModel: Model<ISessionModel> = mongoose.model<ISessionModel>('Session', SessionSchema);
