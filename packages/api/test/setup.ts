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
