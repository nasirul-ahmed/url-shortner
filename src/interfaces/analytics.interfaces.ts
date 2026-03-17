import { DeviceType } from "../types";

export interface IClickEvent {
  shortCode: string;
  timestamp: number;
  country: string;
  countryCode: string;
  device: DeviceType;
  platform: string;
  browser: string;
  ip: string;
  userAgent: string;
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

export interface IAnalyticsSummary {
  shortCode: string;
  totalClicks: number;
  last60sClicks: number;
  deviceBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
  recentEvents: IClickEvent[];
}

export type IAnalyticsSummaryPartial = Omit<IAnalyticsSummary, 'recentEvents'>;

export interface ISocketClickPayload {
  shortCode: string;
  count: number;
  timestamp?: number;
  country?: string;
  platform?: string;
  device?: DeviceType;
  browser?: string;
}

export interface ISocketStatsPayload {
  shortCode: string;
  totalClicks: number;
  last60sClicks: number;
  deviceBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
}
