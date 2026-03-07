import 'reflect-metadata';
import Container from 'typedi';
import { logger } from '../utils/logger';

export async function initializeDependencies({ models }: { models: { name: string; model: any }[] }): Promise<void> {
  // Load all the models into the container first, so they're available for repositories and services
  models.forEach((model) => Container.set(model.name, model));

  // Remaining services are auto-resolved by TypeDI via @Service decorators
  // but we get() them here to trigger eager instantiation and catch errors early

  // TODO: we will create these services later

  // Container.get(UrlRepository);
  // Container.get(AnalyticsService);
  // Container.get(SocketService);
  // Container.get(UrlService);
  // Container.get(UrlController);

  logger.info('Dependency injection container initialized');
}
