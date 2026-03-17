import 'reflect-metadata';
import Container from 'typedi';
import { AppLogger } from '../services/logger';
import { AnalyticsService } from '../services/analytics.service';
import { SocketService } from '../services/socket.service';
import { UrlShortenerService } from '../services/url.services';
import { UrlController } from '../api/url.controller';
import { LocalCacheService } from '../services/cache';

export async function initializeDependencies({
  models,
  logger,
}: {
  models: { name: string; model: any }[];
  logger: AppLogger;
}): Promise<void> {
  // Load all the models into the container first, so they're available for repositories and services
  models.forEach((model) => Container.set(model.name, model));

  // Ensure key services are instantiated early so they set up their lifecycle hooks.
  Container.get(UrlShortenerService);
  Container.get(SocketService);
  Container.get(AnalyticsService);
  Container.get(UrlController);
  Container.get(LocalCacheService);

  logger.info('Dependency injection container initialized');
}
