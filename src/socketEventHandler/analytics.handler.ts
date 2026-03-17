import { Container } from 'typedi';
import { Socket } from 'socket.io';
import { AppLogger } from '../services/logger/app-logger';
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
}

function handleUnsubscribe(socket: Socket, shortCode: string, logger: AppLogger): void {
  const room = getStatsRoom(shortCode);
  socket.leave(room);
  logger.debug('Socket unsubscribed from stats', { data: { socketId: socket.id, shortCode, room } });
}
