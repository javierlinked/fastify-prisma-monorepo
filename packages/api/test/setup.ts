import '../../../test/shared/env';
import {
  mockUserService,
  mockPostService,
  mockNotificationService,
  mockDatabaseService,
} from '../../../test/shared/mocks';

// Mock the container to return our mock services
const mockContainer = {
  resolve: jest.fn((ServiceClass: any) => {
    switch (ServiceClass.name || ServiceClass) {
      case 'UserService':
        return mockUserService;
      case 'PostService':
        return mockPostService;
      case 'NotificationService':
        return mockNotificationService;
      case 'DatabaseService':
        return mockDatabaseService;
      default:
        throw new Error(`Unknown service: ${ServiceClass.name || ServiceClass}`);
    }
  }),
};

jest.mock('@asafe/services', () => ({
  container: mockContainer,
  UserService: 'UserService', // String identifier for mocking
  PostService: 'PostService',
  NotificationService: 'NotificationService',
  DatabaseService: 'DatabaseService',
}));
