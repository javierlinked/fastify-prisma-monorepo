import 'reflect-metadata';
import { NotificationPayload } from '@asafe/types';
import { singleton } from 'tsyringe';
import { INotificationService, WebSocketConnection } from './interfaces';

export interface ConnectedClient {
  userId: string;
  socket: WebSocketConnection;
}

@singleton()
export class NotificationService implements INotificationService {
  private clients: Map<string, ConnectedClient> = new Map();

  addClient(userId: string, socket: WebSocketConnection): void {
    const existingClient = this.clients.get(userId);
    if (existingClient) {
      existingClient.socket.close();
    }

    const client: ConnectedClient = {
      userId,
      socket,
    };

    this.clients.set(userId, client);

    socket.on('close', () => {
      this.removeClient(userId, socket);
    });

    socket.on('error', (error: any) => {
      console.error(`WebSocket error for user ${userId}:`, error);
      this.removeClient(userId, socket);
    });

    this.sendToUser(userId, {
      type: 'SYSTEM',
      message: 'Connected to notification service',
    });
  }

  removeClient(userId: string, socket: WebSocketConnection): void {
    const client = this.clients.get(userId);
    if (client && client.socket === socket) {
      this.clients.delete(userId);
    }
  }

  sendToUser(userId: string, payload: NotificationPayload): boolean {
    const client = this.clients.get(userId);
    if (!client) {
      return false;
    }

    const message = JSON.stringify({
      ...payload,
      timestamp: new Date().toISOString(),
    });

    if (client.socket.readyState === 1) {
      try {
        client.socket.send(message);
        return true;
      } catch (error) {
        console.error(`Failed to send message to user ${userId}:`, error);
        this.removeClient(userId, client.socket);
      }
    } else {
      this.removeClient(userId, client.socket);
    }

    return false;
  }

  broadcast(payload: NotificationPayload, excludeUserId?: string): number {
    let sentCount = 0;

    this.clients.forEach((clients, userId) => {
      if (excludeUserId && userId === excludeUserId) {
        return;
      }

      if (this.sendToUser(userId, payload)) {
        sentCount++;
      }
    });

    return sentCount;
  }

  getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  getConnectionCount(): number {
    return this.clients.size;
  }

  isUserConnected(userId: string): boolean {
    return this.clients.has(userId);
  }

  cleanupInactiveConnections(): void {
    this.clients.forEach((client, userId) => {
      if (client.socket.readyState !== 1) {
        try {
          client.socket.close();
        } catch (error) {}
        this.clients.delete(userId);
      }
    });
  }
}
