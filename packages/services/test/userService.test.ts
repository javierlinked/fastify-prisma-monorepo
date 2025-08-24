import 'reflect-metadata';
import { UserRole } from '@asafe/types';
import { PrismaClient } from '@prisma/client';
import { UserService } from '../src/userService';
import { IDatabaseService, INotificationService } from '../src/interfaces';
import { setupTestContainer, cleanupTestContainer } from './testContainer';

describe('UserService', () => {
  let userService: UserService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockDatabaseService: jest.Mocked<IDatabaseService>;
  let mockNotificationService: jest.Mocked<INotificationService>;
  let testContainer: any;

  beforeEach(() => {
    const testSetup = setupTestContainer();
    testContainer = testSetup.testContainer;
    mockDatabaseService = testSetup.mockDatabaseService;
    mockNotificationService = testSetup.mockNotificationService;
    mockPrisma = testSetup.mockPrisma;

    // Resolve UserService from container
    userService = testContainer.resolve(UserService);
  });

  afterEach(() => {
    cleanupTestContainer(testContainer);
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      const createdUserWithPassword = {
        id: 'user-1',
        email: userData.email,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: UserRole.USER,
        profilePicture: null,
        password: 'hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const expectedUser = {
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

      (mockPrisma.user.create as jest.Mock).mockResolvedValue(createdUserWithPassword);

      const result = await userService.createUser(userData);

      expect(result).toEqual(expectedUser);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: userData.email,
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
          password: expect.any(String), // hashed password
        }),
      });
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      const email = 'test@example.com';
      const expectedUser = {
        id: 'user-1',
        email,
        username: 'testuser',
        password: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.USER,
        profilePicture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(expectedUser);

      const result = await userService.getUserByEmail(email);

      expect(result).toEqual(expectedUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
    });

    it('should return null if user not found', async () => {
      const email = 'nonexistent@example.com';

      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await userService.getUserByEmail(email);

      expect(result).toBeNull();
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', async () => {
      const password = 'password123';
      const hashedPassword = '$2a$10$hashedpassword';

      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const result = await userService.verifyPassword(password, hashedPassword);

      expect(result).toBe(true);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
    });

    it('should return false for incorrect password', async () => {
      const password = 'wrongpassword';
      const hashedPassword = '$2a$10$hashedpassword';

      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      const result = await userService.verifyPassword(password, hashedPassword);

      expect(result).toBe(false);
    });
  });
});
