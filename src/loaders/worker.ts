import { Job, Queue, Worker } from 'bullmq';
import { Container } from 'typedi';
import { AppLogger } from '../services/logger';
import { createRedisClient } from '../redis';
import MailerService from '../services/mailer';
import { AnalyticsModel } from '../models/analytics.model';
import { UrlModel } from '../models/url.model';
import { SocketService } from '../services/socket.service';
import { AnalyticsDashboardService } from '../services/analytics-dashboard.service';
import { DeviceType } from '../types';

export enum JobIdEnums {
  SEND_WELCOME_EMAIL = 'SEND_WELCOME_EMAIL',
  SEND_FORGOT_PASSWORD = 'SEND_FORGOT_PASSWORD',
  PROCESS_CLICK_ANALYTICS = 'PROCESS_CLICK_ANALYTICS',
}

export interface AnalyticsJobData {
  shortCode: string;
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
  timestamp: Date;
}

export default ({ queue, logger }: { queue: Queue; logger: AppLogger }) => {
  const worker = new Worker(queue.name, processJobs, {
    connection: createRedisClient() as any,
    removeOnComplete: { count: 100 }, // Keep last 100 for debugging
    removeOnFail: { count: 500 },
  });

  worker.on('completed', (job: Job) => {
    logger.info(`Job: ${job.id} [${job.name}] completed`);
  });

  worker.on('failed', (job: Job | undefined, error: Error) => {
    console.log(error);
    logger.error(`Job: ${job?.id} [${job?.name}] failed`, { error: error, context: 'EmailWorker', data: job?.data });
  });

  worker.on('error', (err) => {
    logger.error('Email Worker Error', { error: err, context: 'EmailWorker' });
  });
};

const processJobs = async (job: Job): Promise<any> => {
  switch (job.name) {
    case JobIdEnums.SEND_WELCOME_EMAIL:
    case JobIdEnums.SEND_FORGOT_PASSWORD: {
      return await processEmailJob(job);
    }
    case JobIdEnums.PROCESS_CLICK_ANALYTICS: {
      return await processAnalyticsJob(job);
    }

    default:
      throw new Error(`No handler found for job name: ${job.name}`);
  }
};

const processEmailJob = async (job: Job): Promise<any> => {
  const mailerService = Container.get(MailerService);
  const { to, subject, template, variables } = job.data;
  return await mailerService.sendMail({ to, subject, template, variables });
}

const processAnalyticsJob = async (job: Job): Promise<any> => {
      const { shortCode, originalUrl, metadata, timestamp } = job.data as AnalyticsJobData;

      await AnalyticsModel.create({
        shortCode,
        originalUrl,
        timestamp,
        metadata,
      });
      
      // incr url doc totalClicks
      const result = await UrlModel.findOneAndUpdate(
        { shortCode },
        { $inc: { totalClicks: 1 } },
        { new: true, select: 'totalClicks' }
      );

      // Emit new analytics stats after each click
      if (result) {
        const socketService = Container.get(SocketService);
        try {
          const analyticsService = Container.get(AnalyticsDashboardService);
          const analyticsSnapshot = await analyticsService.getAnalytics(shortCode);
          socketService.emitAnalyticsStats(shortCode, analyticsSnapshot);
        } catch (error) {
          // Log error but don't fail the job
          console.error('Failed to emit analytics stats:', error);
        }
      }

      return { success: true, shortCode, totalClicks: result?.totalClicks };
};
