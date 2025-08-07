import 'reflect-metadata';
import { container } from 'tsyringe';
import { NotificationService } from '../src/notificationService';
import { WebSocketConnection } from '../src/interfaces';
import { NotificationPayload } from '@asafe/types';

// Import ConnectedClient interface from the service file
import type { ConnectedClient } from '../src/notificationService';

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockSocket: jest.Mocked<WebSocketConnection>;
  let mockSocket2: jest.Mocked<WebSocketConnection>;
  let testContainer: any;

  beforeEach(() => {
    // Create a child container for testing
    testContainer = container.createChildContainer();
    
    // Register NotificationService
    testContainer.register(NotificationService, { useClass: NotificationService });
    
    // Resolve from container to demonstrate DI pattern
    notificationService = testContainer.resolve(NotificationService);
    
    mockSocket = {
      send: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
      readyState: 1, // WebSocket.OPEN
    };

    mockSocket2 = {
      send: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
      readyState: 1, // WebSocket.OPEN
    };
  });

  afterEach(() => {
    testContainer.clearInstances();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addClient', () => {
    it('should add a client and send welcome message', () => {
      const userId = 'user-123';

      notificationService.addClient(userId, mockSocket);

      expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"SYSTEM"')
      );
      expect(mockSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Connected to notification service"')
      );
    });

    it('should replace existing connection for the same user', () => {
      const userId = 'user-123';

      notificationService.addClient(userId, mockSocket);
      notificationService.addClient(userId, mockSocket2);

      expect(notificationService.getConnectionCount()).toBe(1);
      expect(notificationService.isUserConnected(userId)).toBe(true);
      expect(mockSocket.close).toHaveBeenCalled(); // First socket should be closed
    });

    it('should register event handlers for socket close and error', () => {
      const userId = 'user-123';
      
      notificationService.addClient(userId, mockSocket);
      
      expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('removeClient', () => {
    it('should remove the user connection', () => {
      const userId = 'user-123';

      notificationService.addClient(userId, mockSocket);
      
      expect(notificationService.getConnectionCount()).toBe(1);

      notificationService.removeClient(userId, mockSocket);
      
      expect(notificationService.getConnectionCount()).toBe(0);
      expect(notificationService.isUserConnected(userId)).toBe(false);
    });

    it('should remove user entry when no connections remain', () => {
      const userId = 'user-123';

      notificationService.addClient(userId, mockSocket);
      expect(notificationService.isUserConnected(userId)).toBe(true);

      notificationService.removeClient(userId, mockSocket);
      
      expect(notificationService.isUserConnected(userId)).toBe(false);
      expect(notificationService.getConnectedUsers()).toEqual([]);
    });

    it('should handle removing non-existent client gracefully', () => {
      const userId = 'user-123';
      
      expect(() => {
        notificationService.removeClient(userId, mockSocket);
      }).not.toThrow();
    });
  });

  describe('sendToUser', () => {
    it('should send message to connected user', () => {
      const userId = 'user-123';
      const payload: NotificationPayload = {
        type: 'NEW_POST',
        message: 'Test notification',
        data: { postId: '456' }
      };

      notificationService.addClient(userId, mockSocket);
      mockSocket.send.mockClear(); // Clear the welcome message call

      const result = notificationService.sendToUser(userId, payload);

      expect(result).toBe(true);
      expect(mockSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"NEW_POST"')
      );
      expect(mockSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Test notification"')
      );
      expect(mockSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"timestamp"')
      );
    });

    it('should return false for non-existent user', () => {
      const payload: NotificationPayload = {
        type: 'SYSTEM',
        message: 'Test'
      };

      const result = notificationService.sendToUser('non-existent', payload);

      expect(result).toBe(false);
    });

    it('should handle send errors gracefully', () => {
      const userId = 'user-123';
      const payload: NotificationPayload = {
        type: 'SYSTEM',
        message: 'Test'
      };

      notificationService.addClient(userId, mockSocket);
      mockSocket.send.mockImplementation(() => {
        throw new Error('Connection lost');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = notificationService.sendToUser(userId, payload);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should remove clients with non-open connections', () => {
      const userId = 'user-123';
      const payload: NotificationPayload = {
        type: 'SYSTEM',
        message: 'Test'
      };

      mockSocket.readyState = 3; // WebSocket.CLOSED
      notificationService.addClient(userId, mockSocket);

      const result = notificationService.sendToUser(userId, payload);

      expect(result).toBe(false);
      expect(notificationService.isUserConnected(userId)).toBe(false);
    });
  });

  describe('broadcast', () => {
    it('should send message to all connected users', () => {
      const payload: NotificationPayload = {
        type: 'SYSTEM',
        message: 'Broadcast message'
      };

      notificationService.addClient('user-1', mockSocket);
      notificationService.addClient('user-2', mockSocket2);
      
      // Clear welcome messages
      mockSocket.send.mockClear();
      mockSocket2.send.mockClear();

      const result = notificationService.broadcast(payload);

      expect(result).toBe(2);
      expect(mockSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Broadcast message"')
      );
      expect(mockSocket2.send).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Broadcast message"')
      );
    });

    it('should exclude specified user from broadcast', () => {
      const payload: NotificationPayload = {
        type: 'SYSTEM',
        message: 'Broadcast message'
      };

      notificationService.addClient('user-1', mockSocket);
      notificationService.addClient('user-2', mockSocket2);
      
      // Clear welcome messages
      mockSocket.send.mockClear();
      mockSocket2.send.mockClear();

      const result = notificationService.broadcast(payload, 'user-1');

      expect(result).toBe(1);
      expect(mockSocket.send).not.toHaveBeenCalled();
      expect(mockSocket2.send).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Broadcast message"')
      );
    });
  });

  describe('getConnectedUsers', () => {
    it('should return list of connected user IDs', () => {
      notificationService.addClient('user-1', mockSocket);
      notificationService.addClient('user-2', mockSocket2);

      const connectedUsers = notificationService.getConnectedUsers();

      expect(connectedUsers).toContain('user-1');
      expect(connectedUsers).toContain('user-2');
      expect(connectedUsers).toHaveLength(2);
    });

    it('should return empty array when no users are connected', () => {
      const connectedUsers = notificationService.getConnectedUsers();

      expect(connectedUsers).toEqual([]);
    });
  });

  describe('getConnectionCount', () => {
    it('should return total number of connections', () => {
      notificationService.addClient('user-1', mockSocket);
      notificationService.addClient('user-2', mockSocket2);

      const count = notificationService.getConnectionCount();

      expect(count).toBe(2);
    });

    it('should return 0 when no connections exist', () => {
      const count = notificationService.getConnectionCount();

      expect(count).toBe(0);
    });
  });

  describe('isUserConnected', () => {
    it('should return true for connected user', () => {
      notificationService.addClient('user-1', mockSocket);

      expect(notificationService.isUserConnected('user-1')).toBe(true);
    });

    it('should return false for non-connected user', () => {
      expect(notificationService.isUserConnected('user-1')).toBe(false);
    });

    it('should return false after user disconnects', () => {
      notificationService.addClient('user-1', mockSocket);
      notificationService.removeClient('user-1', mockSocket);

      expect(notificationService.isUserConnected('user-1')).toBe(false);
    });
  });

  describe('cleanupInactiveConnections', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should remove inactive connections', () => {
      const userId = 'user-1';
      
      notificationService.addClient(userId, mockSocket);
      expect(notificationService.isUserConnected(userId)).toBe(true);

      mockSocket.readyState = 3; // WebSocket.CLOSED

      notificationService.cleanupInactiveConnections();

      expect(notificationService.isUserConnected(userId)).toBe(false);
      expect(mockSocket.close).toHaveBeenCalled();
    });

    it('should keep active connections', () => {
      const userId = 'user-1';
      
      notificationService.addClient(userId, mockSocket);
      mockSocket.readyState = 1; // WebSocket.OPEN

      notificationService.cleanupInactiveConnections();

      expect(notificationService.isUserConnected(userId)).toBe(true);
      expect(mockSocket.close).not.toHaveBeenCalled();
    });

    it('should remove connections with closed readyState', () => {
      const userId = 'user-1';
      
      notificationService.addClient(userId, mockSocket);
      mockSocket.readyState = 3; // WebSocket.CLOSED

      notificationService.cleanupInactiveConnections();

      expect(notificationService.isUserConnected(userId)).toBe(false);
      expect(mockSocket.close).toHaveBeenCalled();
    });

    it('should handle close errors gracefully', () => {
      const userId = 'user-1';
      
      notificationService.addClient(userId, mockSocket);
      mockSocket.close.mockImplementation(() => {
        throw new Error('Close failed');
      });

      mockSocket.readyState = 3; // WebSocket.CLOSED

      expect(() => {
        notificationService.cleanupInactiveConnections();
      }).not.toThrow();

      expect(notificationService.isUserConnected(userId)).toBe(false);
    });
  });

  describe('socket event handlers', () => {
    it('should call removeClient when socket closes', () => {
      const userId = 'user-123';
      let closeHandler: Function;

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'close') {
          closeHandler = handler;
        }
      });

      notificationService.addClient(userId, mockSocket);
      
      expect(notificationService.isUserConnected(userId)).toBe(true);
      
      // Simulate socket close
      closeHandler!();
      
      expect(notificationService.isUserConnected(userId)).toBe(false);
    });

    it('should call removeClient and log error when socket errors', () => {
      const userId = 'user-123';
      let errorHandler: Function;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'error') {
          errorHandler = handler;
        }
      });

      notificationService.addClient(userId, mockSocket);
      
      expect(notificationService.isUserConnected(userId)).toBe(true);
      
      // Simulate socket error
      const testError = new Error('Connection failed');
      errorHandler!(testError);
      
      expect(notificationService.isUserConnected(userId)).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WebSocket error for user user-123'),
        testError
      );
      
      consoleSpy.mockRestore();
    });
  });
});
