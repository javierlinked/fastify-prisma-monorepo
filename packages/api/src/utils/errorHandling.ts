import { FastifyReply } from 'fastify';

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: any;
}

/**
 * Creates a standardized error response
 * @param reply - Fastify reply object
 * @param statusCode - HTTP status code
 * @param error - Error type
 * @param message - Error message
 * @param details - Optional additional details
 * @returns Fastify reply object
 */
export function sendErrorResponse(
  reply: FastifyReply,
  statusCode: number,
  error: string,
  message: string,
  details?: any
) {
  return reply.status(statusCode).send({
    error,
    message,
    statusCode,
    ...(details && { details }),
  });
}

/**
 * Handles Prisma database errors and sends appropriate HTTP responses
 */
export function handleResourcePrismaError(
  err: any,
  reply: FastifyReply,
  resourceType = 'Resource'
): boolean {
  if (err.code === 'P2002') {
    const message = `${resourceType} already exists`;

    sendErrorResponse(reply, 409, 'Conflict', message);
    return true;
  }

  if (err.code === 'P2025') {
    sendErrorResponse(reply, 404, 'Not Found', `${resourceType} not found`);
    return true;
  }

  return false;
}

export function sendNotFoundError(reply: FastifyReply, message = 'Resource not found') {
  return sendErrorResponse(reply, 404, 'Not Found', message);
}

export function sendForbiddenError(reply: FastifyReply, message = 'Access denied') {
  return sendErrorResponse(reply, 403, 'Forbidden', message);
}

/**
 * Common error handling logic that can be used by both route handlers and the global error handler
 */
export function handleError(err: any, reply: FastifyReply, request?: any): boolean {
  if (request?.log) {
    request.log.error(err);
  }

  if (err.validation) {
    sendErrorResponse(
      reply,
      400,
      'Validation Error',
      err.message || "Request doesn't match the schema"
    );
    return true;
  }

  if (handleResourcePrismaError(err, reply)) {
    return true;
  }

  if (err.statusCode) {
    sendErrorResponse(reply, err.statusCode, err.name || 'Error', err.message);
    return true;
  }

  sendErrorResponse(reply, 500, 'Internal Server Error', 'Something went wrong');
  return true;
}
