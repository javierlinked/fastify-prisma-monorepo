// Mock the services package to provide test implementations
jest.mock('@asafe/services', () => {
  // Create mock service instances without requiring the actual module first
  const mockUserService = {
    createUser: jest.fn(),
    getUserById: jest.fn(),
    getUserByEmail: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    verifyPassword: jest.fn(),
    getAllUsers: jest.fn(),
  };

  const mockPostService = {
    createPost: jest.fn(),
    getPostById: jest.fn(),
    updatePost: jest.fn(),
    deletePost: jest.fn(),
    getAllPosts: jest.fn(),
    getPostsByAuthor: jest.fn(),
  };

  const mockNotificationService = {
    addConnection: jest.fn(),
    removeConnection: jest.fn(),
    sendNotification: jest.fn(),
    broadcast: jest.fn(),
    cleanupInactiveConnections: jest.fn(),
  };

  const mockDatabaseService = {
    getClient: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue(true),
  };

  return {
    userService: mockUserService,
    postService: mockPostService,
    notificationService: mockNotificationService,
    databaseService: mockDatabaseService,
  };
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Global test timeout
jest.setTimeout(10000);

// Basic setup test
describe('Test Setup', () => {
  it('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBe('test-secret');
  });
});
