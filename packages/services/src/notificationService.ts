import { NotificationPayload } from '@asafe/types';

export interface WebSocketConnection {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  on(event: string, listener: (...args: any[]) => void): void;
  readyState: number;
}

export interface ConnectedClient {
  userId: string;
  socket: WebSocketConnection;
  lastSeen: Date;
}

export class NotificationService {
  private clients: Map<string, ConnectedClient[]> = new Map();

  addClient(userId: string, socket: WebSocketConnection): void {
    const client: ConnectedClient = {
      userId,
      socket,
      lastSeen: new Date(),
    };

    if (!this.clients.has(userId)) {
      this.clients.set(userId, []);
    }

    this.clients.get(userId)!.push(client);

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
    const userClients = this.clients.get(userId);
    if (userClients) {
      const index = userClients.findIndex(client => client.socket === socket);
      if (index !== -1) {
        userClients.splice(index, 1);
        if (userClients.length === 0) {
          this.clients.delete(userId);
        }
      }
    }
  }

  sendToUser(userId: string, payload: NotificationPayload): boolean {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.length === 0) {
      return false;
    }

    const message = JSON.stringify({
      ...payload,
      timestamp: new Date().toISOString(),
    });

    let sentToAtLeastOne = false;
    const clientsCopy = [...userClients];
    
    clientsCopy.forEach(client => {
      if (client.socket.readyState === 1) {
        try {
          client.socket.send(message);
          client.lastSeen = new Date();
          sentToAtLeastOne = true;
        } catch (error) {
          console.error(`Failed to send message to user ${userId}:`, error);
          this.removeClient(userId, client.socket);
        }
      } else {
        this.removeClient(userId, client.socket);
      }
    });

    return sentToAtLeastOne;
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
    let count = 0;
    this.clients.forEach(clients => {
      count += clients.length;
    });
    return count;
  }

  isUserConnected(userId: string): boolean {
    const userClients = this.clients.get(userId);
    return userClients ? userClients.length > 0 : false;
  }

  cleanupInactiveConnections(maxInactiveMinutes = 30): void {
    const cutoffTime = new Date(Date.now() - maxInactiveMinutes * 60 * 1000);

    this.clients.forEach((clients, userId) => {
      const activeClients = clients.filter(client => {
        if (client.lastSeen < cutoffTime || client.socket.readyState !== 1) {
          try {
            client.socket.close();
          } catch (error) {}
          return false;
        }
        return true;
      });

      if (activeClients.length === 0) {
        this.clients.delete(userId);
      } else {
        this.clients.set(userId, activeClients);
      }
    });
  }
}

export const notificationService = new NotificationService();
