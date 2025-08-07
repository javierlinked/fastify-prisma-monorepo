import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import { singleton } from 'tsyringe';
import { IDatabaseService } from './interfaces';

/**
 * Singleton database service using TSyringe
 */
@singleton()
export class DatabaseService implements IDatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  public getClient(): PrismaClient {
    return this.prisma;
  }

  public async connect(): Promise<void> {
    await this.prisma.$connect();
  }

  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
