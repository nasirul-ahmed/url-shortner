import { Container } from 'typedi';
import { Socket } from 'socket.io';
import { AppLogger } from '../services/logger/app-logger';
import { AnalyticsDashboardService } from '../services/analytics-dashboard.service';
import { SocketService } from '../services/socket.service';
import { getStatsRoom } from '../utils/helper';

export function getAnalyticsEventHandlers(): Record<string, (socket: Socket, data: any) => void> {
  const logger = Container.get(AppLogger);

  return {
    subscribe: (socket: Socket, shortCode: string) => handleSubscribe(socket, shortCode, logger),
    unsubscribe: (socket: Socket, shortCode: string) => handleUnsubscribe(socket, shortCode, logger),
  };
}

function handleSubscribe(socket: Socket, shortCode: string, logger: AppLogger): void {
  console.log({ shortCode });
  const room = getStatsRoom(shortCode);
  socket.join(room);
  logger.debug('Socket subscribed to stats', { data: { socketId: socket.id, shortCode, room } });

  // Emit initial full analytics snapshot when client subscribes
  try {
    const analyticsService = Container.get(AnalyticsDashboardService);
    const socketService = Container.get(SocketService);

    analyticsService.getAnalytics(shortCode, 30).then(analytics => {
      socketService.emitAnalyticsStats(shortCode, analytics);
      logger.debug('Emitted initial analytics stats', { data: { socketId: socket.id, shortCode } });
    }).catch(error => {
      logger.error('Failed to emit initial analytics stats', { error, data: { socketId: socket.id, shortCode } });
    });
  } catch (error) {
    logger.error('Failed to setup initial analytics snapshot', { error, data: { socketId: socket.id, shortCode } });
  }
}

function handleUnsubscribe(socket: Socket, shortCode: string, logger: AppLogger): void {
  const room = getStatsRoom(shortCode);
  socket.leave(room);
  logger.debug('Socket unsubscribed from stats', { data: { socketId: socket.id, shortCode, room } });
}
