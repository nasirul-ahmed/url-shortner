import { Service } from 'typedi';
import { AnalyticsModel } from '../models/analytics.model';
import { UrlModel } from '../models/url.model';
import { AppLogger } from './logger/app-logger';
import { AnalyticsDashboard, DeviceBreakdown, ReferrerStats, TimeSeriesData } from 'src/interfaces';
import { normalizeDeviceBreakdown } from '../utils/analytics-helpers';
import dayjs from 'dayjs';

@Service()
export class AnalyticsDashboardService {
  constructor(private readonly logger: AppLogger) {}

  async getAnalytics(shortCode: string, days: number = 30): Promise<AnalyticsDashboard> {
    const startDate = dayjs().subtract(days, 'day').toDate();

    try {
      // Get total clicks from URL model - fastest lookup for total count
      const urlDoc = await UrlModel.findOne({ shortCode }, { totalClicks: 1 });
      const totalClicks = urlDoc?.totalClicks || 0;

      // Get detailed analytics from ClickAnalytics collection
      const analytics = await AnalyticsModel.find({
        shortCode,
        timestamp: { $gte: startDate }
      });

      // Calculate unique visitors
      const uniqueVisitors = new Set(analytics.map(a => a.metadata.visitorId)).size;

      // Device breakdown
      const deviceBreakdown = analytics.reduce((acc, record) => {
        const device = record.metadata.device;
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topReferrers = this.buildTopReferrers(analytics, 10);
      const clicksOverTime = this.buildClicksOverTime(analytics);

      return {
        shortCode,
        totalClicks,
        uniqueVisitors,
        deviceBreakdown: normalizeDeviceBreakdown(deviceBreakdown),
        topReferrers,
        clicksOverTime,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get analytics for - ${shortCode}`, { 
        error, 
        data: {shortCode}, 
        context: this.getAnalytics.name 
      });
      throw error;
    }
  }

  async getRecentClicks(shortCode: string, minutes: number = 60): Promise<number> {
    const startTime = dayjs().subtract(minutes, 'minute').toDate();

    const count = await AnalyticsModel.countDocuments({
      shortCode,
      timestamp: { $gte: startTime }
    });

    return count;
  }

  async cleanupOldData(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = dayjs().subtract(daysToKeep, 'day').toDate();

    const result = await AnalyticsModel.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    this.logger.info(`Cleaned up ${result.deletedCount} old analytics records`);
    return result.deletedCount;
  }

  private buildTopReferrers(
    analytics: any[],
    limit: number = 10
  ): Array<{ referer: string; count: number }> {
    const referrerMap = new Map<string, number>();
    analytics.forEach(record => {
      const referer = record.metadata.referer;
      if (referer && referer.trim()) {
        referrerMap.set(referer, (referrerMap.get(referer) || 0) + 1);
      }
    });

    return Array.from(referrerMap.entries())
      .map(([referer, count]) => ({ referer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  private buildClicksOverTime(analytics: any[]): Array<{ date: string; clicks: number }> {
    const clicksByDay = new Map<string, number>();
    analytics.forEach(record => {
      const date = record.timestamp.toISOString().split('T')[0];
      clicksByDay.set(date, (clicksByDay.get(date) || 0) + 1);
    });

    return Array.from(clicksByDay.entries())
      .map(([date, clicks]) => ({ date, clicks }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getOverallAnalytics(days: number = 30): Promise<{
    totalClicks: number;
    uniqueVisitors: number;
    totalUrls: number;
    deviceBreakdown: DeviceBreakdown;
    topReferrers: ReferrerStats[];
    clicksOverTime: TimeSeriesData[];
    topUrls: Array<{ shortCode: string; clicks: number }>;
    lastUpdated: Date;
  }> {
    const startDate = dayjs().subtract(days, 'day').toDate();

    try {
      // Get total clicks across all URLs
      const totalClicks = await AnalyticsModel.countDocuments({
        timestamp: { $gte: startDate }
      });

      // Get all analytics records for the period
      const analytics = await AnalyticsModel.find({
        timestamp: { $gte: startDate }
      });

      // Calculate unique visitors
      const uniqueVisitors = new Set(analytics.map(a => a.metadata.visitorId)).size;

      // Total unique URLs clicked
      const totalUrls = new Set(analytics.map(a => a.shortCode)).size;

      // Device breakdown
      const deviceBreakdown = analytics.reduce((acc, record) => {
        const device = record.metadata.device;
        acc[device] = (acc[device] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const topReferrers = this.buildTopReferrers(analytics, 10);
      const clicksOverTime = this.buildClicksOverTime(analytics);

      // Top URLs
      const urlClicks = new Map<string, number>();
      analytics.forEach(record => {
        urlClicks.set(record.shortCode, (urlClicks.get(record.shortCode) || 0) + 1);
      });

      const topUrls = Array.from(urlClicks.entries())
        .map(([shortCode, clicks]) => ({ shortCode, clicks }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 20); // Top 20 URLs

      return {
        totalClicks,
        uniqueVisitors,
        totalUrls,
        deviceBreakdown: normalizeDeviceBreakdown(deviceBreakdown),
        topReferrers,
        clicksOverTime,
        topUrls,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to get overall analytics`, { 
        error, 
        context: this.getOverallAnalytics.name 
      });
      throw error;
    }
  }
}