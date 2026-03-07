import { IUrlDocument, ICreateUrlPayload } from './url.interfaces';
import { IClickEvent, IAnalyticsSummaryPartial } from './analytics.interfaces';

export interface IUrlRepository {
  create(payload: ICreateUrlPayload & { shortCode: string }): Promise<IUrlDocument>;
  findByShortCode(shortCode: string): Promise<IUrlDocument | null>;
  findByAlias(alias: string): Promise<IUrlDocument | null>;
  existsByShortCode(shortCode: string): Promise<boolean>;
  incrementClickCount(shortCode: string): Promise<void>;
  deactivate(shortCode: string): Promise<boolean>;
}

export interface IRedisRepository {
  setUrlMapping(shortCode: string, longUrl: string): Promise<void>;
  getUrlMapping(shortCode: string): Promise<string | null>;
  deleteUrlMapping(shortCode: string): Promise<void>;
  acquireAliasLock(alias: string): Promise<boolean>;
  releaseAliasLock(alias: string): Promise<void>;
  recordClick(event: IClickEvent): Promise<void>;
  getTotalClicks(shortCode: string): Promise<number>;
  getLast60sClicks(shortCode: string): Promise<number>;
  getCountryBreakdown(shortCode: string): Promise<Record<string, number>>;
  getDeviceBreakdown(shortCode: string): Promise<Record<string, number>>;
  getFullAnalytics(shortCode: string): Promise<IAnalyticsSummaryPartial>;
  ping(): Promise<boolean>;
}
