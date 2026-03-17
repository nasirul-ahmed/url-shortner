import { Server, Socket } from 'socket.io';
import { AppLogger } from '../services/logger';
import { getAnalyticsEventHandlers } from './analytics.handler';

export default (io: Server, logger: AppLogger) => {
  io.on('connection', (socket: Socket) => {
    const eventHandlers = getAnalyticsEventHandlers();
    logger.debug('Socket connected', { data: { socketId: socket.id } });

    for (const eventName in eventHandlers) {
      socket.on(eventName, (data: any) => eventHandlers[eventName](socket, data));
    }

    socket.on('disconnect', () => {
      logger.debug('Socket disconnected', { data: { socketId: socket.id } });
    });
  });
};
