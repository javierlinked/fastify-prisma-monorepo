import { userService } from '@asafe/services';
import {
  authResponseSchema,
  errorResponseSchema,
  loginSchema,
  messageResponseSchema,
  registerSchema,
  tokenResponseSchema,
  userSchema,
} from '@asafe/types';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { requireAuth } from '../middleware/auth';

import { handleError, sendNotFoundError, sendUnauthorizedError } from '../utils/errorHandling';

const authRoutes: FastifyPluginAsyncZod = async fastify => {
  fastify.route({
    method: 'POST',
    url: '/register',
    schema: {
      tags: ['Authentication'],
      body: registerSchema,
      response: {
        201: authResponseSchema,
        409: errorResponseSchema,
        400: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      try {
        const user = await userService.createUser(request.body);

        const token = generateJwtToken(fastify, user);

        const response = { token, user };

        return reply.status(201).send(response);
      } catch (err) {
        handleError(err, reply, request);
      }
    },
  });

  fastify.route({
    method: 'POST',
    url: '/login',
    schema: {
      tags: ['Authentication'],
      body: loginSchema,
      response: {
        200: authResponseSchema,
        401: errorResponseSchema,
        400: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { email, password } = request.body;

      const user = await userService.getUserByEmail(email);

      if (!user) {
        return sendUnauthorizedError(reply);
      }

      const isValidPassword = await userService.verifyPassword(password, user.password);

      if (!isValidPassword) {
        return sendUnauthorizedError(reply);
      }

      const token = generateJwtToken(fastify, user);

      const response = { token, user };

      return response;
    },
  });

  fastify.route({
    method: 'POST',
    url: '/refresh',
    preHandler: [requireAuth()],
    schema: {
      tags: ['Authentication'],
      security: [{ Bearer: [] }],
      response: {
        200: tokenResponseSchema,
        401: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const user = request.user!;

      const token = fastify.jwt.sign({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      });

      return { token };
    },
  });

  fastify.route({
    method: 'POST',
    url: '/logout',
    preHandler: [requireAuth()],
    schema: {
      tags: ['Authentication'],
      security: [{ Bearer: [] }],
      response: {
        200: messageResponseSchema,
      },
    },
    handler: async (request, reply) => {
      return { message: 'Logged out successfully' };
    },
  });

  fastify.route({
    method: 'GET',
    url: '/me',
    preHandler: [requireAuth()],
    schema: {
      tags: ['Authentication'],
      security: [{ Bearer: [] }],
      response: {
        200: userSchema,
        404: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const user = request.user!;
      const userData = await userService.getUserById(user.id);

      if (!userData) {
        return sendNotFoundError(reply, 'User not found');
      }

      return userData;
    },
  });
};

function generateJwtToken(fastify: any, user: any): string {
  return fastify.jwt.sign({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  });
}

export default authRoutes;
