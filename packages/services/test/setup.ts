import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    post: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $disconnect: jest.fn(),
  })),
  UserRole: {
    USER: 'USER',
    ADMIN: 'ADMIN',
  },
}));

process.env.NODE_ENV = 'test';

jest.setTimeout(10000);

describe('Services Test Setup', () => {
  it('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
