import { Service, Inject } from 'typedi';
import { Server as SocketIOServer } from 'socket.io';
import { AppLogger } from './logger/app-logger';
import { ISocketClickPayload, ISocketStatsPayload } from '../interfaces/analytics.interfaces';
import { SOCKET_IO_SERVER } from '../loaders/socket-io';
import { getStatsRoom } from '../utils/helper';

@Service()
export class SocketService {
  private lastTimestamp: string = '';
  private clickBuffers = new Map<string, { count: number; timer: NodeJS.Timeout }>();

  constructor(
    @Inject(SOCKET_IO_SERVER) private io: SocketIOServer,
    private logger: AppLogger,
  ) {}

  private getTimestamp(): string {
    const now = Date.now();
    const lastTime = new Date(this.lastTimestamp).getTime();
    if (now - lastTime > 1000) {
      // Update every second
      this.lastTimestamp = new Date(now).toISOString();
    }
    return this.lastTimestamp;
  }

  public emitClickUpdate(shortCode: string, count: number): void {
    const room = getStatsRoom(shortCode);
    const buffer = this.clickBuffers.get(shortCode);

    if (buffer) {
      // Update existing buffer with latest count
      clearTimeout(buffer.timer);
      buffer.count = count;
    } else {
      // Create new buffer
      this.clickBuffers.set(shortCode, { count, timer: null as any });
    }

    const newBuffer = this.clickBuffers.get(shortCode)!;

    this.logger.debug('Broadcasting debounced click update', { data: { room, count: newBuffer.count } });
    this.io.to(room).emit('click_update', {
      shortCode,
      count: newBuffer.count,
      timestamp: this.getTimestamp(),
    });
    this.clickBuffers.delete(shortCode);
  }

  public emitStatsUpdate(shortCode: string, stats: ISocketStatsPayload): void {
    const room = getStatsRoom(shortCode);
    this.logger.debug('Broadcasting stats update', { data: { room } });
    this.io.to(room).emit('stats_update', {
      shortCode,
      ...stats,
      timestamp: this.getTimestamp(),
    });
  }
}
