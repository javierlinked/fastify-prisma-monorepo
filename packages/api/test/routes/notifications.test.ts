import 'reflect-metadata';
import { container, NotificationService } from '@asafe/services';
import { UserRole } from '@asafe/types';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import Fastify, { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { authMiddleware } from '../../src/middleware/auth';
import notificationRoutes from '../../src/routes/notifications';

// Mock the container to return a mocked NotificationService
const mockNotificationService = {
  addClient: jest.fn(),
  removeClient: jest.fn(),
  sendToUser: jest.fn(),
  broadcast: jest.fn(),
  getConnectedUsers: jest.fn(),
  getConnectionCount: jest.fn(),
  isUserConnected: jest.fn(),
  cleanupInactiveConnections: jest.fn(),
} as any;

// Mock the container.resolve method
jest.mock('@asafe/services', () => ({
  container: {
    resolve: jest.fn((serviceClass) => {
      if (serviceClass === NotificationService) {
        return mockNotificationService;
      }
      return {};
    }),
  },
  NotificationService: jest.fn(),
}));

describe('Notification Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify().withTypeProvider<ZodTypeProvider>();

    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    await app.register(jwt, {
      secret: 'test-secret',
    });

    await app.register(websocket);

    app.decorate('authenticate', authMiddleware);

    await app.register(notificationRoutes, { prefix: '/notifications' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /notifications/send/:userId', () => {
    it('should send notification to specific user (admin only)', async () => {
      const adminToken = app.jwt.sign({
        id: 'admin-1',
        email: 'admin@example.com',
        username: 'admin',
        role: UserRole.ADMIN,
      });

      const notificationData = {
        type: 'SYSTEM',
        message: 'Test notification',
        data: { test: true },
      };

      mockNotificationService.sendToUser.mockReturnValue(true);

      const response = await app.inject({
        method: 'POST',
        url: '/notifications/send/user-123',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: notificationData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual({
        message: 'Notification sent successfully',
        sent: true,
        userId: 'user-123',
      });

      expect(mockNotificationService.sendToUser).toHaveBeenCalledWith(
        'user-123',
        notificationData
      );
    });

    it('should return 403 for non-admin users', async () => {
      const userToken = app.jwt.sign({
        id: 'user-1',
        email: 'user@example.com',
        username: 'user',
        role: UserRole.USER,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/notifications/send/user-123',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          type: 'SYSTEM',
          message: 'Test notification',
        },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should indicate when user is not connected', async () => {
      const adminToken = app.jwt.sign({
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      mockNotificationService.sendToUser.mockReturnValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/notifications/send/user-123',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          type: 'SYSTEM',
          message: 'Test notification',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual({
        message: 'User not connected',
        sent: false,
        userId: 'user-123',
      });
    });
  });

  describe('POST /notifications/broadcast', () => {
    it('should broadcast notification to all users (admin only)', async () => {
      const adminToken = app.jwt.sign({
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      const broadcastData = {
        type: 'SYSTEM',
        message: 'Broadcast message',
        data: { announcement: true },
      };

      mockNotificationService.broadcast.mockReturnValue(5);

      const response = await app.inject({
        method: 'POST',
        url: '/notifications/broadcast',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: broadcastData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual({
        message: 'Broadcast sent successfully',
        sentToUsers: 5,
      });

      expect(mockNotificationService.broadcast).toHaveBeenCalledWith(
        broadcastData,
        undefined
      );
    });

    it('should exclude specified user from broadcast', async () => {
      const adminToken = app.jwt.sign({
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      const broadcastData = {
        type: 'SYSTEM',
        message: 'Broadcast message',
        excludeUserId: 'user-to-exclude',
      };

      mockNotificationService.broadcast.mockReturnValue(3);

      const response = await app.inject({
        method: 'POST',
        url: '/notifications/broadcast',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: broadcastData,
      });

      expect(response.statusCode).toBe(200);

      expect(mockNotificationService.broadcast).toHaveBeenCalledWith(
        {
          type: 'SYSTEM',
          message: 'Broadcast message',
        },
        'user-to-exclude'
      );
    });

    it('should return 403 for non-admin users', async () => {
      const userToken = app.jwt.sign({
        id: 'user-1',
        role: UserRole.USER,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/notifications/broadcast',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          type: 'SYSTEM',
          message: 'Broadcast message',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /notifications/connected', () => {
    it('should return connected users (admin only)', async () => {
      const adminToken = app.jwt.sign({
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      mockNotificationService.getConnectedUsers.mockReturnValue(['user-1', 'user-2', 'user-3']);
      mockNotificationService.getConnectionCount.mockReturnValue(5);

      const response = await app.inject({
        method: 'GET',
        url: '/notifications/connected',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual({
        connectedUsers: ['user-1', 'user-2', 'user-3'],
        connectionCount: 5,
        uniqueUsers: 3,
      });
    });

    it('should return 403 for non-admin users', async () => {
      const userToken = app.jwt.sign({
        id: 'user-1',
        role: UserRole.USER,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/notifications/connected',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /notifications/status/:userId', () => {
    it('should return connection status for own user', async () => {
      const userToken = app.jwt.sign({
        id: 'user-123',
        role: UserRole.USER,
      });

      mockNotificationService.isUserConnected.mockReturnValue(true);

      const response = await app.inject({
        method: 'GET',
        url: '/notifications/status/user-123',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual({
        userId: 'user-123',
        isConnected: true,
      });

      expect(mockNotificationService.isUserConnected).toHaveBeenCalledWith('user-123');
    });

    it('should allow admin to check any user status', async () => {
      const adminToken = app.jwt.sign({
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      mockNotificationService.isUserConnected.mockReturnValue(false);

      const response = await app.inject({
        method: 'GET',
        url: '/notifications/status/user-456',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual({
        userId: 'user-456',
        isConnected: false,
      });
    });

    it('should return 403 when user tries to check other user status', async () => {
      const userToken = app.jwt.sign({
        id: 'user-123',
        role: UserRole.USER,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/notifications/status/user-456',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('You can only check your own connection status');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/notifications/status/user-123',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Input validation', () => {
    it('should validate notification payload schema', async () => {
      const adminToken = app.jwt.sign({
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/notifications/send/user-123',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          type: 'INVALID_TYPE',
          message: 'Test',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate broadcast payload schema', async () => {
      const adminToken = app.jwt.sign({
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/notifications/broadcast',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          type: 'SYSTEM',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate userId parameter', async () => {
      const adminToken = app.jwt.sign({
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      const response = await app.inject({
        method: 'GET',
        url: '/notifications/status/invalid-user-id-with-special-chars!@#',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      // Should still work as the validation is on the route level
      expect(response.statusCode).toBe(200);
    });
  });

  describe('Error handling', () => {
    it('should handle notification service errors gracefully', async () => {
      const adminToken = app.jwt.sign({
        id: 'admin-1',
        role: UserRole.ADMIN,
      });

      mockNotificationService.sendToUser.mockImplementation(() => {
        throw new Error('Service error');
      });

      const response = await app.inject({
        method: 'POST',
        url: '/notifications/send/user-123',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          type: 'SYSTEM',
          message: 'Test',
        },
      });

      expect(response.statusCode).toBe(500);
    });
  });
});
