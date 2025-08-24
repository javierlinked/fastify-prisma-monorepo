import '../../../test/shared/env';
import {
  mockUserService,
  mockPostService,
  mockNotificationService,
  mockDatabaseService,
} from '../../../test/shared/mocks';

jest.mock('@asafe/services', () => ({
  userService: mockUserService,
  postService: mockPostService,
  notificationService: mockNotificationService,
  databaseService: mockDatabaseService,
}));

describe('Test Setup', () => {
  it('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBe('test-secret');
  });
});
