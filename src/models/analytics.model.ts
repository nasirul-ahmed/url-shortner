import mongoose, { Document, Schema, Model } from 'mongoose';
import { devices } from '../types';
import { IAnalyticsDocument } from 'src/interfaces';


export interface IAnalyticsModel extends Omit<IAnalyticsDocument, '_id'>, Document {}

const AnalyticsSchema = new Schema<IAnalyticsModel>(
  {
    shortCode: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      required: true,
      // index: true,
      default: Date.now,
    },
    originalUrl: {
      type: String,
      required: true,
      trim: true,
    },
    metadata: {
      ip: {
        type: String,
        required: true,
      },
      userAgent: {
        type: String,
        required: true,
      },
      referer: {
        type: String,
        trim: true,
      },
      country: {
        type: String,
        required: true,
        default: 'Unknown',
      },
      device: {
        type: String,
        required: true,
        enum: Object.values(devices),
        default: 'unknown',
      },
      platform: {
        type: String,
        required: true,
        default: 'Unknown',
      },
      browser: {
        type: String,
        required: true,
        default: 'Unknown',
      },
      visitorId: {
        type: String,
        required: true,
        index: true, // For unique visitor queries
      },
    },
  },
  {
    timestamps: false,
    versionKey: false,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret['id'] = ret._id?.toString();
        delete ret._id;
        return ret;
      },
    },
  },
);

// Compound indexes for efficient analytics queries
AnalyticsSchema.index({ shortCode: 1, timestamp: -1 }); // Time-series queries
AnalyticsSchema.index({ shortCode: 1, 'metadata.visitorId': 1 }); // Unique visitors
AnalyticsSchema.index({ shortCode: 1, 'metadata.device': 1 }); // Device breakdown
AnalyticsSchema.index({ shortCode: 1, 'metadata.referer': 1 }); // Top referrers

// TTL index for data retention (90 days)
AnalyticsSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AnalyticsModel: Model<IAnalyticsModel> = mongoose.model<IAnalyticsModel>(
  'Analytics',
  AnalyticsSchema,
);