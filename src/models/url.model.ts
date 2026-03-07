import mongoose, { Document, Schema, Model } from 'mongoose';
import { IUrlDocument } from '../interfaces';

/**
 * Mongoose document interface.
 */
export interface IUrlModel extends Omit<IUrlDocument, '_id'>, Document {}

const UrlSchema = new Schema<IUrlModel>(
  {
    shortCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    longUrl: {
      type: String,
      required: true,
      trim: true,
    },
    customAlias: {
      type: String,
      sparse: true,
      index: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 }, // MongoDB TTL index
    },
    userId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    // Optimize reads - we mostly need shortCode + longUrl
    toJSON: {
      transform: (_doc, ret) => {
        ret['id'] = ret._id?.toString();
        delete ret._id;
        return ret;
      },
    },
  },
);

// Compound index for user-based listing
UrlSchema.index({ userId: 1, createdAt: -1 });

// Partial index: only active URLs
UrlSchema.index({ shortCode: 1, isActive: 1 });

export const UrlModel: Model<IUrlModel> = mongoose.model<IUrlModel>('Url', UrlSchema);
