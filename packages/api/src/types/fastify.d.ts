import { UserRole } from '@asafe/types';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      username: string;
      role: UserRole;
    };
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: {
      id: string;
      email: string;
      username: string;
      role: UserRole;
    };
  }
}
