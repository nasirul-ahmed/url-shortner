import 'reflect-metadata';
import Container from 'typedi';
import { AppLogger } from '../services/logger';
import { AnalyticsDashboardService } from '../services/analytics-dashboard.service';
import { SocketService } from '../services/socket.service';
import { UrlShortenerService } from '../services/url.services';
import { AuthService } from '../services/auth.service';
import { LocalCacheService } from '../services/cache';
import { SessionService } from '../services/session.service';
import queueLoader from './queue';
import { Queue } from 'bullmq';

export async function initializeDependencies({
  models,
  logger,
}: {
  models: { name: string; model: any }[];
  logger: AppLogger;
}): Promise<{ queue: Queue }> {
  // Load all the models into the container first, so they're available for repositories and services
  models.forEach((model) => Container.set(model.name, model));

  const queue = queueLoader();
  Container.set(queue.name, queue);

  // Ensure key services are instantiated early so they set up their lifecycle hooks.
  Container.get(LocalCacheService);
  Container.get(UrlShortenerService);
  Container.get(SocketService);
  Container.get(AnalyticsDashboardService);
  Container.get(SessionService);
  Container.get(AuthService);

  logger.info('Dependency injection container initialized');

  return { queue };
}
