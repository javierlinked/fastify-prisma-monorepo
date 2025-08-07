export const mockUserService = {
  createUser: jest.fn(),
  getUserById: jest.fn(),
  getUserByEmail: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  verifyPassword: jest.fn(),
  getAllUsers: jest.fn(),
};

export const mockPostService = {
  createPost: jest.fn(),
  getPostById: jest.fn(),
  updatePost: jest.fn(),
  deletePost: jest.fn(),
  getAllPosts: jest.fn(),
  getPostsByAuthor: jest.fn(),
};

export const mockNotificationService = {
  addClient: jest.fn(),
  removeClient: jest.fn(),
  sendToUser: jest.fn(),
  broadcast: jest.fn(),
  getConnectedUsers: jest.fn().mockReturnValue([]),
  getConnectionCount: jest.fn().mockReturnValue(0),
  isUserConnected: jest.fn().mockReturnValue(false),
  cleanupInactiveConnections: jest.fn(),
};

export const mockDatabaseService = {
  getClient: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  healthCheck: jest.fn().mockResolvedValue(true),
};
