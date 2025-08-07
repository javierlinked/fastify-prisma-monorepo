import { NotificationPayload } from '@asafe/types';

export interface WebSocketConnection {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  on(event: string, listener: (...args: any[]) => void): void;
  readyState: number;
}

export interface INotificationService {
  addClient(userId: string, socket: WebSocketConnection): void;
  removeClient(userId: string, socket: WebSocketConnection): void;
  sendToUser(userId: string, payload: NotificationPayload): boolean;
  broadcast(payload: NotificationPayload, excludeUserId?: string): number;
  getConnectedUsers(): string[];
  getConnectionCount(): number;
  isUserConnected(userId: string): boolean;
  cleanupInactiveConnections(): void;
}
