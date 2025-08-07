import { PrismaClient } from '@prisma/client';

export interface IDatabaseService {
  getClient(): PrismaClient;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<boolean>;
}
