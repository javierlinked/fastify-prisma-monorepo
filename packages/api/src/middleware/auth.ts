import { UserRole } from '@asafe/types';
import { FastifyReply, FastifyRequest } from 'fastify';

export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    id: string;
    email: string;
    username: string;
    role: UserRole;
  };
}

export function authenticate(allowedRoles?: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await request.jwtVerify();
      request.user = payload as {
        id: string;
        email: string;
        username: string;
        role: UserRole;
      };

      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(request.user.role)) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Insufficient permissions',
            statusCode: 403,
          });
        }
      }
    } catch (err) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Invalid or missing token',
        statusCode: 401,
      });
    }
  };
}

export const requireAuth = () => authenticate();
export const requireAdmin = () => authenticate([UserRole.ADMIN]);
export const requireUser = () => authenticate([UserRole.USER, UserRole.ADMIN]);

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  return authenticate()(request, reply);
}

export function requireRole(roles: UserRole[]) {
  return authenticate(roles);
}
