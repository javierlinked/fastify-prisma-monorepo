import 'reflect-metadata';
import { container, PostService } from '@asafe/services';
import {
  createPostSchema,
  errorResponseSchema,
  idParamSchema,
  paginatedPostsResponseSchema,
  paginationSchema,
  postSchema,
  updatePostSchema,
  userIdParamSchema,
} from '@asafe/types';
import { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';

import { sendForbiddenError, sendNotFoundError } from '../utils/errorHandling';
import { paginateResponse } from '../utils/pagination';

const postRoutes: FastifyPluginAsyncZod = async fastify => {
  const postService = container.resolve(PostService);
  fastify.route({
    method: 'GET',
    url: '/',
    schema: {
      tags: ['Posts'],
      querystring: paginationSchema,
      response: {
        200: paginatedPostsResponseSchema,
        400: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { page, limit } = request.query;
      const result = await postService.getAllPosts(page, limit);

      return paginateResponse(result.posts, result.total, result.page, limit);
    },
  });

  fastify.route({
    method: 'POST',
    url: '/',
    preHandler: [requireAuth()],
    schema: {
      tags: ['Posts'],
      security: [{ Bearer: [] }],
      body: createPostSchema,
      response: {
        201: postSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const user = (request as AuthenticatedRequest).user;
      const post = await postService.createPost(user.id, request.body);
      return reply.status(201).send(post);
    },
  });

  fastify.route({
    method: 'GET',
    url: '/:id',
    schema: {
      tags: ['Posts'],
      params: idParamSchema,
      response: {
        200: postSchema,
        400: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params;

      const post = await postService.getPostById(id);

      if (!post) {
        return sendNotFoundError(reply, 'Post not found');
      }

      return post;
    },
  });

  fastify.route({
    method: 'PUT',
    url: '/:id',
    preHandler: [requireAuth()],
    schema: {
      tags: ['Posts'],
      security: [{ Bearer: [] }],
      params: idParamSchema,
      body: updatePostSchema,
      response: {
        200: postSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        403: errorResponseSchema,
        404: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params;
      const user = (request as AuthenticatedRequest).user;
      const post = await postService.updatePost(id, user.id, request.body);
      return post;
    },
  });

  fastify.route({
    method: 'DELETE',
    url: '/:id',
    preHandler: [requireAuth()],
    schema: {
      tags: ['Posts'],
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
      const user = (request as AuthenticatedRequest).user;
      await postService.deletePost(id, user.id);
      return reply.status(204).send();
    },
  });

  fastify.route({
    method: 'GET',
    url: '/user/:userId',
    schema: {
      tags: ['Posts'],
      params: userIdParamSchema,
      querystring: paginationSchema,
      response: {
        200: paginatedPostsResponseSchema,
        400: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const { userId } = request.params;
      const { page, limit } = request.query;

      const result = await postService.getPostsByAuthor(userId, page, limit);

      return paginateResponse(result.posts, result.total, result.page, limit);
    },
  });

  fastify.route({
    method: 'GET',
    url: '/me/posts',
    preHandler: [requireAuth()],
    schema: {
      tags: ['Posts'],
      security: [{ Bearer: [] }],
      querystring: paginationSchema,
      response: {
        200: paginatedPostsResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        500: errorResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const user = (request as AuthenticatedRequest).user;
      const { page, limit } = request.query;

      const result = await postService.getPostsByAuthor(user.id, page, limit);

      return paginateResponse(result.posts, result.total, result.page, limit);
    },
  });
};

export default postRoutes;
