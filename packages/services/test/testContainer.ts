import 'reflect-metadata';
import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { IDatabaseService, INotificationService } from '../src/interfaces';
import { S3Config, UserService } from '../src/userService';
import { PostService } from '../src/postService';

// Create mock implementations
export const createMockDatabaseService = (): jest.Mocked<IDatabaseService> => ({
  getClient: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  healthCheck: jest.fn(),
});

export const createMockNotificationService = (): jest.Mocked<INotificationService> => ({
  addClient: jest.fn(),
  removeClient: jest.fn(),
  sendToUser: jest.fn(),
  broadcast: jest.fn(),
  getConnectedUsers: jest.fn(),
  getConnectionCount: jest.fn(),
  isUserConnected: jest.fn(),
  cleanupInactiveConnections: jest.fn(),
});

export const createTestS3Config = (): S3Config => ({
  region: 'eu-north-1',
  bucketName: 'test-bucket',
  accessKeyId: 'test-key',
  secretAccessKey: 'test-secret',
});

export const setupTestContainer = () => {
  // Create a child container for testing
  const testContainer = container.createChildContainer();
  
  // Create mock services
  const mockDatabaseService = createMockDatabaseService();
  const mockNotificationService = createMockNotificationService();
  const testS3Config = createTestS3Config();
  
  // Setup mock Prisma client
  const mockPrisma = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    post: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  } as unknown as jest.Mocked<PrismaClient>;
  
  mockDatabaseService.getClient.mockReturnValue(mockPrisma);
  
  // Register mock services
  testContainer.registerInstance<IDatabaseService>('IDatabaseService', mockDatabaseService);
  testContainer.registerInstance<INotificationService>('INotificationService', mockNotificationService);
  testContainer.registerInstance<S3Config>('S3Config', testS3Config);
  
  // Register service classes with factory functions to match production container
  testContainer.register(UserService, {
    useFactory: (container) => {
      const databaseService = container.resolve<IDatabaseService>('IDatabaseService');
      const notificationService = container.resolve<INotificationService>('INotificationService');
      const s3Config = container.resolve<S3Config>('S3Config');
      return new UserService(databaseService, notificationService, s3Config);
    }
  });
  
  testContainer.register(PostService, {
    useFactory: (container) => {
      const databaseService = container.resolve<IDatabaseService>('IDatabaseService');
      const notificationService = container.resolve<INotificationService>('INotificationService');
      return new PostService(databaseService, notificationService);
    }
  });
  
  return {
    testContainer,
    mockDatabaseService,
    mockNotificationService,
    mockPrisma,
    testS3Config,
  };
};

export const cleanupTestContainer = (testContainer: any) => {
  testContainer.clearInstances();
};
