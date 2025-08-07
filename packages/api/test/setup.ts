jest.mock('@asafe/services', () => {
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
    addClient: jest.fn(),
    removeClient: jest.fn(),
    sendToUser: jest.fn(),
    broadcast: jest.fn(),
    getConnectedUsers: jest.fn().mockReturnValue([]),
    getConnectionCount: jest.fn().mockReturnValue(0),
    isUserConnected: jest.fn().mockReturnValue(false),
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

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

jest.setTimeout(10000);

describe('Test Setup', () => {
  it('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBe('test-secret');
  });
});
