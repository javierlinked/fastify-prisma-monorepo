import { notificationService } from '@asafe/services';
import {
  broadcastRequestSchema,
  broadcastResponseSchema,
  connectedUsersResponseSchema,
  errorResponseSchema,
  NotificationPayload,
  sendNotificationRequestSchema,
  sendNotificationResponseSchema,
  UserRole,
  userIdParamSchema,
  userStatusResponseSchema,
} from '@asafe/types';
import { FastifyPluginAsync } from 'fastify';
import { AuthenticatedRequest, requireAdmin, requireAuth } from '../middleware/auth';

const notificationRoutes: FastifyPluginAsync = async fastify => {
  setInterval(
    () => {
      notificationService.cleanupInactiveConnections(30);
    },
    10 * 60 * 1000
  );

  fastify.get<{
    Querystring: { token: string };
  }>('/ws', { websocket: true }, (connection, request) => {
    const token = request.query.token;

    if (!token) {
      connection.close(1008, 'Authentication required');
      return;
    }

    try {
      const payload = fastify.jwt.verify(token);
      const userId = (payload as any).id;

      notificationService.addClient(userId, connection);

      fastify.log.info(`User ${userId} connected to WebSocket`);

      connection.on('message', (message: any) => {
        try {
          const data = JSON.parse(message.toString());
          fastify.log.info(`Received message from user ${userId}:`, data);

          connection.send(
            JSON.stringify({
              type: 'SYSTEM',
              message: 'Message received',
              data,
            })
          );
        } catch (error) {
          fastify.log.error('Error parsing WebSocket message:', error);
        }
      });
    } catch (error) {
      fastify.log.error('WebSocket authentication failed:', error);
      connection.close(1008, 'Invalid token');
    }
  });

  /**
   * Send notification to specific user
   * Only accessible by admins
   */
  fastify.post(
    '/send/:userId',
    {
      preHandler: [requireAdmin()],
      schema: {
        tags: ['Notifications'],
        security: [{ Bearer: [] }],
        params: userIdParamSchema,
        body: sendNotificationRequestSchema,
        response: {
          200: sendNotificationResponseSchema,
          403: errorResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };
      const payload = request.body as NotificationPayload;

      const sent = notificationService.sendToUser(userId, payload);

      return {
        message: sent ? 'Notification sent successfully' : 'User not connected',
        sent,
        userId,
      };
    }
  );

  /**
   * Broadcast notification to all connected users
   * Only accessible by admins
   */
  fastify.post(
    '/broadcast',
    {
      preHandler: [requireAdmin()],
      schema: {
        tags: ['Notifications'],
        security: [{ Bearer: [] }],
        body: broadcastRequestSchema,
        response: {
          200: broadcastResponseSchema,
          403: errorResponseSchema,
          400: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { excludeUserId, ...payload } = request.body as NotificationPayload & {
        excludeUserId?: string;
      };

      const sentCount = notificationService.broadcast(payload, excludeUserId);

      return {
        message: 'Broadcast sent successfully',
        sentToUsers: sentCount,
      };
    }
  );

  /**
   * Get connected users
   * Only accessible by admins
   */
  fastify.get(
    '/connected',
    {
      preHandler: [requireAdmin()],
      schema: {
        tags: ['Notifications'],
        security: [{ Bearer: [] }],
        response: {
          200: connectedUsersResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const connectedUsers = notificationService.getConnectedUsers();
      const connectionCount = notificationService.getConnectionCount();

      return {
        connectedUsers,
        connectionCount,
        uniqueUsers: connectedUsers.length,
      };
    }
  );

  /**
   * Check if user is connected
   * Users can check their own status, admins can check any user's status
   */
  fastify.get(
    '/status/:userId',
    {
      preHandler: [requireAuth()],
      schema: {
        tags: ['Notifications'],
        security: [{ Bearer: [] }],
        params: userIdParamSchema,
        response: {
          200: userStatusResponseSchema,
          403: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const currentUser = (request as AuthenticatedRequest).user;
      const { userId } = request.params as { userId: string };

      if (currentUser.id !== userId && currentUser.role !== UserRole.ADMIN) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'You can only check your own connection status',
        });
      }

      const isConnected = notificationService.isUserConnected(userId);

      return {
        userId,
        isConnected,
      };
    }
  );

  fastify.decorate('notificationService', notificationService);
};

export default notificationRoutes;
