import { userService } from '@asafe/services';
import {
  createUserSchema,
  errorResponseSchema,
  idParamSchema,
  paginatedUsersResponseSchema,
  paginationSchema,
  UserRole,
  UserWithoutPassword,
  updateUserSchema,
  userSchema,
} from '@asafe/types';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AuthenticatedRequest, requireAdmin, requireAuth } from '../middleware/auth';

import {
  handleUserPrismaError,
  sendForbiddenError,
  sendNotFoundError,
} from '../utils/errorHandling';
import { paginateResponse } from '../utils/pagination';

const userRoutes: FastifyPluginAsyncZod = async fastify => {
  /**
   * Get all users with pagination
   * Only accessible by admins
   */
  fastify.route({
    method: 'GET',
    url: '/',
    preHandler: [requireAdmin()],
    schema: {
      tags: ['Users'],
      security: [{ Bearer: [] }],
      querystring: paginationSchema,
      response: {
        200: paginatedUsersResponseSchema,
        403: errorResponseSchema,
        400: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { page, limit } = request.query;
      const result = await userService.getAllUsers(page, limit);

      return paginateResponse<UserWithoutPassword>(result.users, result.total, result.page, limit);
    },
  });

  /**
   * Create a new user
   * Only accessible by admins
   */
  fastify.route({
    method: 'POST',
    url: '/',
    preHandler: [requireAdmin()],
    schema: {
      tags: ['Users'],
      security: [{ Bearer: [] }],
      body: createUserSchema,
      response: {
        201: userSchema,
        409: errorResponseSchema,
        400: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const user = await userService.createUser(request.body);
        return reply.status(201).send(user);
      } catch (err: any) {
        return handleUserPrismaError(err, reply);
      }
    },
  });

  /**
   * Get user by ID
   * Accessible by anyone
   */
  fastify.route({
    method: 'GET',
    url: '/:id',
    schema: {
      tags: ['Users'],
      params: idParamSchema,
      response: {
        200: userSchema,
        404: errorResponseSchema,
        400: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params;

      const user = await userService.getUserById(id);

      if (!user) {
        return sendNotFoundError(reply, 'User not found');
      }

      return user;
    },
  });

  /**
   * Get current user's profile
   * Accessible by authenticated users
   */
  fastify.route({
    method: 'GET',
    url: '/me/profile',
    preHandler: [requireAuth()],
    schema: {
      tags: ['Users'],
      security: [{ Bearer: [] }],
      response: {
        200: userSchema,
        404: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { id } = (request as AuthenticatedRequest).user;

      const user = await userService.getUserById(id);

      if (!user) {
        return sendNotFoundError(reply, 'User not found');
      }

      return user;
    },
  });

  /**
   * Update user profile
   * Users can update their own profile, admins can update any profile
   */
  fastify.route({
    method: 'PUT',
    url: '/:id',
    preHandler: [requireAuth()],
    schema: {
      tags: ['Users'],
      security: [{ Bearer: [] }],
      params: idParamSchema,
      body: updateUserSchema,
      response: {
        200: userSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        409: errorResponseSchema,
        400: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params;
      const currentUser = (request as AuthenticatedRequest).user;

      if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
        return sendForbiddenError(reply, 'You can only update your own profile');
      }

      try {
        const user = await userService.updateUser(id, request.body);
        return user;
      } catch (err: any) {
        return handleUserPrismaError(err, reply);
      }
    },
  });

  /**
   * Delete user
   * Users can delete their own account, admins can delete any account
   */
  fastify.route({
    method: 'DELETE',
    url: '/:id',
    preHandler: [requireAuth()],
    schema: {
      tags: ['Users'],
      security: [{ Bearer: [] }],
      params: idParamSchema,
      response: {
        204: z.null(),
        403: errorResponseSchema,
        404: errorResponseSchema,
        400: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params;
      const currentUser = (request as AuthenticatedRequest).user;

      if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
        return sendForbiddenError(reply, 'You can only delete your own account');
      }

      try {
        await userService.deleteUser(id);
        return reply.status(204).send();
      } catch (err: any) {
        return handleUserPrismaError(err, reply);
      }
    },
  });
};

export default userRoutes;
