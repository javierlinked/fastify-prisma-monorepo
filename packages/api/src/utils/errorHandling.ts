import { FastifyReply } from 'fastify';

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}

/**
 * Handles common Prisma database errors and sends appropriate HTTP responses
 * @param err - Prisma error object
 * @param reply - Fastify reply object
 */
export function handlePrismaError(err: any, reply: FastifyReply): void {
  if (err.code === 'P2002') {
    reply.status(409).send({
      error: 'Conflict',
      message: 'Resource already exists',
      statusCode: 409,
    });
    return;
  }

  if (err.code === 'P2025') {
    reply.status(404).send({
      error: 'Not Found',
      message: 'Resource not found',
      statusCode: 404,
    });
    return;
  }

  throw err;
}

/**
 * Handles user-specific Prisma errors with contextual messages
 * @param err - Prisma error object
 * @param reply - Fastify reply object
 */
export function handleUserPrismaError(err: any, reply: FastifyReply): void {
  if (err.code === 'P2002') {
    reply.status(409).send({
      error: 'Conflict',
      message: 'Email or username already exists',
      statusCode: 409,
    });
    return;
  }

  if (err.code === 'P2025') {
    reply.status(404).send({
      error: 'Not Found',
      message: 'User not found',
      statusCode: 404,
    });
    return;
  }

  throw err;
}

export function handlePostPrismaError(err: any, reply: FastifyReply): boolean {
  if (err.code === 'P2025') {
    reply.status(404).send({
      error: 'Not Found',
      message: 'Post not found',
      statusCode: 404,
    });
    return true;
  }

  return false;
}

export function sendNotFoundError(reply: FastifyReply, resource = 'Resource') {
  return reply.status(404).send({
    error: 'Not Found',
    message: `${resource} not found`,
    statusCode: 404,
  });
}

export function sendForbiddenError(reply: FastifyReply, message = 'Access denied') {
  return reply.status(403).send({
    error: 'Forbidden',
    message,
    statusCode: 403,
  });
}

export function sendUnauthorizedError(reply: FastifyReply, message = 'Unauthorized') {
  return reply.status(401).send({
    error: 'Unauthorized',
    message,
    statusCode: 401,
  });
}

export function sendConflictError(reply: FastifyReply, message = 'Resource already exists') {
  return reply.status(409).send({
    error: 'Conflict',
    message,
    statusCode: 409,
  });
}

export function sendBadRequestError(reply: FastifyReply, message = 'Bad Request') {
  return reply.status(400).send({
    error: 'Bad Request',
    message,
    statusCode: 400,
  });
}

/**
 * Higher-order function that wraps route handlers with comprehensive error handling
 * @param handler - Route handler function to wrap
 * @returns Wrapped handler with error handling
 */
export function withErrorHandling(handler: Function) {
  return async (request: any, reply: any) => {
    try {
      return await handler(request, reply);
    } catch (err: any) {
      request.log?.error(err);

      try {
        handlePrismaError(err, reply);
        return;
      } catch (originalErr) {
      }

      if (err.statusCode) {
        return reply.status(err.statusCode).send({
          error: err.name || 'Error',
          message: err.message,
          statusCode: err.statusCode,
        });
      }

      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Something went wrong',
        statusCode: 500,
      });
    }
  };
}
