import { UserRole } from '@asafe/types';
import { FastifyReply, FastifyRequest } from 'fastify';
import { 
  AuthenticatedRequest, 
  authMiddleware, 
  authenticate, 
  requireAuth, 
  requireAdmin, 
  requireUser, 
  requireRole 
} from '../../src/middleware/auth';

describe('Auth Middleware', () => {
  let mockRequest: FastifyRequest & { jwtVerify: jest.Mock };
  let mockReply: Partial<FastifyReply>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      jwtVerify: jest.fn(),
    } as FastifyRequest & { jwtVerify: jest.Mock };
    mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('authMiddleware (basic authentication)', () => {
    it('should authenticate valid token and set user on request', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.USER,
      };

      mockRequest.jwtVerify.mockResolvedValue(mockUser);

      const result = await authMiddleware(mockRequest, mockReply as FastifyReply);

      expect(mockRequest.jwtVerify).toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual(mockUser);
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(mockReply.send).not.toHaveBeenCalled();
      expect(result).toBeUndefined(); // Middleware should not return anything on success
    });

    it('should reject invalid token with 401', async () => {
      mockRequest.jwtVerify.mockRejectedValue(new Error('Invalid token'));

      const result = await authMiddleware(mockRequest, mockReply as FastifyReply);

      expect(mockRequest.jwtVerify).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid or missing token',
        statusCode: 401,
      });
      expect((mockRequest as any).user).toBeUndefined();
      expect(result).toBe(mockReply);
    });

    it('should reject missing token with 401', async () => {
      mockRequest.jwtVerify.mockRejectedValue(
        new Error('No Authorization was found in request.headers')
      );

      const result = await authMiddleware(mockRequest, mockReply as FastifyReply);

      expect(mockRequest.jwtVerify).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid or missing token',
        statusCode: 401,
      });
      expect((mockRequest as any).user).toBeUndefined();
      expect(result).toBe(mockReply);
    });
  });

  describe('authenticate function with role-based access', () => {
    it('should allow access when no roles are specified', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.USER,
      };

      mockRequest.jwtVerify.mockResolvedValue(mockUser);

      const middleware = authenticate();
      const result = await middleware(mockRequest, mockReply as FastifyReply);

      expect(mockRequest.jwtVerify).toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual(mockUser);
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should allow access when user has required role', async () => {
      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        username: 'admin',
        role: UserRole.ADMIN,
      };

      mockRequest.jwtVerify.mockResolvedValue(mockUser);

      const middleware = authenticate([UserRole.ADMIN]);
      const result = await middleware(mockRequest, mockReply as FastifyReply);

      expect(mockRequest.jwtVerify).toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual(mockUser);
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should deny access when user lacks required role', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.USER,
      };

      mockRequest.jwtVerify.mockResolvedValue(mockUser);

      const middleware = authenticate([UserRole.ADMIN]);
      const result = await middleware(mockRequest, mockReply as FastifyReply);

      expect(mockRequest.jwtVerify).toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual(mockUser);
      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        statusCode: 403,
      });
      expect(result).toBe(mockReply);
    });

    it('should allow access when user has one of multiple allowed roles', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.USER,
      };

      mockRequest.jwtVerify.mockResolvedValue(mockUser);

      const middleware = authenticate([UserRole.USER, UserRole.ADMIN]);
      const result = await middleware(mockRequest, mockReply as FastifyReply);

      expect(mockRequest.jwtVerify).toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual(mockUser);
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('convenience functions', () => {
    it('requireAuth should work like basic authentication', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.USER,
      };

      mockRequest.jwtVerify.mockResolvedValue(mockUser);

      const middleware = requireAuth();
      const result = await middleware(mockRequest, mockReply as FastifyReply);

      expect(result).toBeUndefined();
      expect((mockRequest as any).user).toEqual(mockUser);
    });

    it('requireAdmin should only allow admin users', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.USER,
      };

      mockRequest.jwtVerify.mockResolvedValue(mockUser);

      const middleware = requireAdmin();
      const result = await middleware(mockRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(result).toBe(mockReply);
    });

    it('requireAdmin should allow admin users', async () => {
      const mockUser = {
        id: 'admin-1',
        email: 'admin@example.com',
        username: 'admin',
        role: UserRole.ADMIN,
      };

      mockRequest.jwtVerify.mockResolvedValue(mockUser);

      const middleware = requireAdmin();
      const result = await middleware(mockRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('requireUser should allow both USER and ADMIN roles', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.USER,
      };

      mockRequest.jwtVerify.mockResolvedValue(mockUser);

      const middleware = requireUser();
      const result = await middleware(mockRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
      expect(result).toBeUndefined();

      jest.clearAllMocks();
      mockRequest.jwtVerify = jest.fn();

      const mockAdmin = {
        id: 'admin-1',
        email: 'admin@example.com',
        username: 'admin',
        role: UserRole.ADMIN,
      };

      mockRequest.jwtVerify.mockResolvedValue(mockAdmin);

      const middleware2 = requireUser();
      const result2 = await middleware2(mockRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
      expect(result2).toBeUndefined();
    });

    it('requireRole should deny access when user lacks required role', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.USER,
      };

      mockRequest.jwtVerify.mockResolvedValue(mockUser);

      const middleware = requireRole([UserRole.ADMIN]);
      const result = await middleware(mockRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Insufficient permissions',
        statusCode: 403,
      });
      expect(result).toBe(mockReply);
    });

    it('requireRole should work with custom role arrays', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.USER,
      };

      mockRequest.jwtVerify.mockResolvedValue(mockUser);

      const middleware = requireRole([UserRole.USER]);
      const result = await middleware(mockRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty allowedRoles array (should allow any authenticated user)', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.USER,
      };

      mockRequest.jwtVerify.mockResolvedValue(mockUser);

      const middleware = authenticate([]);
      const result = await middleware(mockRequest, mockReply as FastifyReply);

      expect(mockRequest.jwtVerify).toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual(mockUser);
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle JWT verification with malformed payload', async () => {
      const malformedPayload = { id: 'user-1' }; // Missing required fields

      mockRequest.jwtVerify.mockResolvedValue(malformedPayload);

      const middleware = authenticate();
      const result = await middleware(mockRequest, mockReply as FastifyReply);

      expect(mockRequest.jwtVerify).toHaveBeenCalled();
      expect((mockRequest as any).user).toEqual(malformedPayload);
      expect(mockReply.status).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });

    it('should handle network timeout errors during JWT verification', async () => {
      mockRequest.jwtVerify.mockRejectedValue(new Error('Network timeout'));

      const middleware = authenticate();
      const result = await middleware(mockRequest, mockReply as FastifyReply);

      expect(mockRequest.jwtVerify).toHaveBeenCalled();
      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Invalid or missing token',
        statusCode: 401,
      });
      expect(result).toBe(mockReply);
    });
  });
});
