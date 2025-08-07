import { CreateUserRequest, NotificationPayload, UpdateUserRequest, UserWithoutPassword } from '@asafe/types';
import { FileUploadService } from '@asafe/utilities';
import { PrismaClient, User, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { databaseService } from './databaseService';
import { notificationService } from './notificationService';

export class UserService {
  private prisma: PrismaClient;
  private fileUploadService?: FileUploadService;

  constructor() {
    this.prisma = databaseService.getClient();

    const s3Config = {
      region: process.env.AWS_REGION || 'us-east-1',
      bucketName: process.env.AWS_S3_BUCKET_NAME || 'asafe-uploads-dev',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };

    if (s3Config.bucketName && s3Config.accessKeyId && s3Config.secretAccessKey) {
      this.fileUploadService = new FileUploadService({
        s3Config,
        maxFileSize: Number.parseInt(process.env.MAX_FILE_SIZE || '5242880'),
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      });
    }
  }

  protected excludePassword(user: User): UserWithoutPassword {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async createUser(data: CreateUserRequest) {
    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await this.prisma.user.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });

    return this.excludePassword(user);
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        posts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) return null;

    return this.excludePassword(user);
  }

  async getUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async getUserByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) return null;

    return this.excludePassword(user);
  }

  async updateUser(id: string, data: UpdateUserRequest) {
    const originalUser = await this.prisma.user.findUnique({
      where: { id },
    });

    // TODO: If updating profile picture, should delete the old one first

    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    const updatedUser = this.excludePassword(user);

    if (originalUser && (data.profilePicture || data.username)) {
      try {
        let updateMessage = 'Profile updated';
        
        if (data.profilePicture) {
          updateMessage = 'Profile picture updated';
        } else if (data.username) {
          updateMessage = `Username changed to ${data.username}`;
        }

        const notification: NotificationPayload = {
          type: 'USER_UPDATE',
          message: `${originalUser.username} ${updateMessage}`,
          data: {
            userId: updatedUser.id,
            username: updatedUser.username,
            profilePicture: updatedUser.profilePicture,
            updateType: data.profilePicture ? 'profile_picture' : 'username',
          },
        };

        notificationService.broadcast(notification, id);
      } catch (error) {
        console.error('Failed to send user update notification:', error);
      }
    }

    return updatedUser;
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.profilePicture) {
      try {
        if (!this.fileUploadService) {
          console.warn('File upload service not configured, skipping S3 deletion');
        } else {
          await this.fileUploadService.deleteFile(user.profilePicture);
        }
      } catch (error: any) {
        console.error(`Failed to delete profile picture for user ${id}:`, error.message);
      }
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }

  async getAllUsers(
    page = 1,
    limit = 10
  ): Promise<{
    users: UserWithoutPassword[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { posts: true },
          },
        },
      }),
      this.prisma.user.count(),
    ]);

    const usersWithoutPassword = users.map((user: User) => this.excludePassword(user));

    return {
      users: usersWithoutPassword,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async updateUserRole(id: string, role: UserRole) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { role },
    });

    return this.excludePassword(user);
  }
}

export const userService = new UserService();
