import '../../../test/shared/env';
import { mockPrismaClient } from '../../../test/shared/prisma';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
  UserRole: {
    USER: 'USER',
    ADMIN: 'ADMIN',
  },
}));
