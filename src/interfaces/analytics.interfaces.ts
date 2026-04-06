import { DeviceType } from "../types";

export interface DeviceBreakdown {
  desktop: number;
  mobile: number;
  tablet: number;
  unknown: number;
}

export interface ReferrerStats {
  referer: string;
  count: number;
}

export interface TimeSeriesData {
  date: string;
  clicks: number;
}

export interface AnalyticsDashboard {
  shortCode: string;
  totalClicks: number;
  uniqueVisitors: number;
  deviceBreakdown: DeviceBreakdown;
  topReferrers: ReferrerStats[];
  clicksOverTime: TimeSeriesData[];
  lastUpdated: Date;
}

export interface IAnalyticsDocument {
  _id?: string;
  shortCode: string;
  timestamp: Date;
  originalUrl: string;
  metadata: {
    ip: string;
    userAgent: string;
    referer?: string;
    country: string;
    device: DeviceType;
    platform: string;
    browser: string;
    visitorId: string;
  };
}

export interface IGeoInfo {
  country: string;
  countryCode: string;
}

export interface IDeviceInfo {
  device: DeviceType;
  platform: string;
  browser: string;
}

export interface ISocketStatsPayload {
  shortCode: string;
  totalClicks: number;
  last60sClicks: number;
  deviceBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
}
