import 'reflect-metadata';
import { container, UserService } from '@asafe/services';
import { UserRole } from '@asafe/types';
import jwt from '@fastify/jwt';
import Fastify, { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { authMiddleware } from '../../src/middleware/auth';
import authRoutes from '../../src/routes/auth';

// Mock the container to return a mocked UserService
const mockUserService = {
  createUser: jest.fn(),
  getUserByEmail: jest.fn(),
  getUserByUsername: jest.fn(),
  verifyPassword: jest.fn(),
  getUserById: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  getAllUsers: jest.fn(),
  updateUserRole: jest.fn(),
} as any;

// Mock the container.resolve method
jest.mock('@asafe/services', () => ({
  container: {
    resolve: jest.fn((serviceClass) => {
      if (serviceClass === UserService) {
        return mockUserService;
      }
      return {};
    }),
  },
  UserService: jest.fn(),
}));

describe('Auth Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify().withTypeProvider<ZodTypeProvider>();

    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    await app.register(jwt, {
      secret: 'test-secret',
    });

    app.decorate('authenticate', authMiddleware);

    await app.register(authRoutes, { prefix: '/auth' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const createdUser = {
        id: 'user-1',
        email: userData.email,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: UserRole.USER,
        profilePicture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserService.createUser.mockResolvedValue(createdUser);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: userData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('token');
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe(userData.email);
      expect(mockUserService.createUser).toHaveBeenCalledWith(userData);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        email: 'invalid-email',
        username: 'ab', // too short
        password: '123', // too short
      };

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(['Bad Request', 'Validation Error']).toContain(body.error);
    });

    it('should return 409 for duplicate email/username', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const dbError = new Error('Unique constraint failed');
      (dbError as any).code = 'P2002';
      mockUserService.createUser.mockRejectedValue(dbError);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: userData,
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toBe('Conflict');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123',
      };

      const user = {
        id: 'user-1',
        email: loginData.email,
        username: 'testuser',
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        profilePicture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserService.getUserByEmail.mockResolvedValue(user);
      mockUserService.verifyPassword.mockResolvedValue(true);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: loginData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('token');
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe(loginData.email);
      expect(body.user).not.toHaveProperty('password');
      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith(loginData.email);
      expect(mockUserService.verifyPassword).toHaveBeenCalledWith(
        loginData.password,
        user.password
      );
    });

    it('should return 401 for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockUserService.getUserByEmail.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: loginData,
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 401 for wrong password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const user = {
        id: 'user-1',
        email: loginData.email,
        username: 'testuser',
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        profilePicture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserService.getUserByEmail.mockResolvedValue(user);
      mockUserService.verifyPassword.mockResolvedValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: loginData,
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user with valid token', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        profilePicture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const token = app.jwt.sign({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
      });

      mockUserService.getUserById.mockResolvedValue(user);

      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.email).toBe(user.email);
      expect(mockUserService.getUserById).toHaveBeenCalledWith(user.id);
    });

    it('should return 401 without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 404 if user not found', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: UserRole.USER,
      };

      const token = app.jwt.sign(user);

      mockUserService.getUserById.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
      expect(body.error).toBe('Not Found');
    });
  });
});
