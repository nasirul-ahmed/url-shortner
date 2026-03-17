import { ICreateUrlPayload, ICreateUrlResult } from './url.interfaces';
import { IAnalyticsSummary, ISocketClickPayload, ISocketStatsPayload } from './analytics.interfaces';
import { IRequestContext } from './request-response.interfaces';

export interface IUrlService {
  createShortUrl(payload: ICreateUrlPayload): Promise<ICreateUrlResult>;
  resolveUrl(shortCode: string): Promise<string>;
  getAnalytics(shortCode: string): Promise<IAnalyticsSummary>;
}

export interface IAnalyticsService {
  processClick(shortCode: string): Promise<void>;
  getAnalytics(shortCode: string): Promise<IAnalyticsSummary>;
}

export interface ISocketService {
  emitClickEvent(payload: ISocketClickPayload): void;
  emitStatsUpdate(shortCode: string, stats: ISocketStatsPayload): void;
}
