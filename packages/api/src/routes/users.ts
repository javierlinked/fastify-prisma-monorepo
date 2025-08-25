import 'reflect-metadata';
import { container, UserService } from '@asafe/services';
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

import { sendForbiddenError, sendNotFoundError } from '../utils/errorHandling';
import { paginateResponse } from '../utils/pagination';

const userRoutes: FastifyPluginAsyncZod = async fastify => {
  const userService = container.resolve(UserService);
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
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { page, limit } = request.query;
      const result = await userService.getAllUsers(page, limit);

      return paginateResponse<UserWithoutPassword>(result.users, result.total, result.page, limit);
    },
  });

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
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        409: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const user = await userService.createUser(request.body);
      return reply.status(201).send(user);
    },
  });

  fastify.route({
    method: 'GET',
    url: '/:id',
    schema: {
      tags: ['Users'],
      params: idParamSchema,
      response: {
        200: userSchema,
        400: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema,
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

  fastify.route({
    method: 'GET',
    url: '/me/profile',
    preHandler: [requireAuth()],
    schema: {
      tags: ['Users'],
      security: [{ Bearer: [] }],
      response: {
        200: userSchema,
        401: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema,
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
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        409: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params;
      const currentUser = (request as AuthenticatedRequest).user;

      if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
        return sendForbiddenError(reply, 'You can only update your own profile');
      }

      const user = await userService.updateUser(id, request.body);
      return user;
    },
  });

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
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params;
      const currentUser = (request as AuthenticatedRequest).user;

      if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
        return sendForbiddenError(reply, 'You can only delete your own account');
      }

      await userService.deleteUser(id);
      return reply.status(204).send();
    },
  });
};

export default userRoutes;
