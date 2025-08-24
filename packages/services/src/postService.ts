import 'reflect-metadata';
import { CreatePostRequest, NotificationPayload, UpdatePostRequest } from '@asafe/types';
import { Post, PrismaClient } from '@prisma/client';
import { inject, injectable } from 'tsyringe';
import { IDatabaseService, INotificationService } from './interfaces';

@injectable()
export class PostService {
  private prisma: PrismaClient;

  constructor(
    private databaseService: IDatabaseService,
    private notificationService: INotificationService
  ) {
    this.prisma = this.databaseService.getClient();
  }

  /**
   * Creates a new post with author information and sends real-time notifications
   * @param authorId - ID of the post author
   * @param data - Post creation data (title, content)
   * @returns Created post with author details
   */
  async createPost(authorId: string, data: CreatePostRequest): Promise<Post> {
    const post = await this.prisma.post.create({
      data: {
        ...data,
        authorId,
      },
      include: {
        author: true,
      },
    });

    try {
      const notification: NotificationPayload = {
        type: 'NEW_POST',
        message: `New post created: "${post.title}" by ${post.author?.username || 'Unknown'}`,
        data: {
          postId: post.id,
          title: post.title,
          authorId: post.authorId,
          authorUsername: post.author?.username,
          createdAt: post.createdAt,
        },
      };

      this.notificationService.broadcast(notification, authorId);
    } catch (error) {
      console.error('Failed to send post creation notification:', error);
    }

    return post;
  }

  /**
   * Retrieves a post by ID with author information
   * @param id - Post ID
   * @returns Post with author details or null if not found
   */
  async getPostById(id: string): Promise<Post | null> {
    return this.prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
      },
    });
  }

  /**
   * Updates a post with ownership validation
   * @param id - Post ID
   * @param authorId - ID of the requesting user
   * @param data - Updated post data
   * @returns Updated post with author details
   * @throws Error if post not found or user lacks permission
   */
  async updatePost(id: string, authorId: string, data: UpdatePostRequest): Promise<Post> {
    const existingPost = await this.prisma.post.findFirst({
      where: {
        id,
        authorId,
      },
    });

    if (!existingPost) {
      throw new Error('Post not found or you do not have permission to update it');
    }

    return this.prisma.post.update({
      where: { id },
      data,
      include: {
        author: true,
      },
    });
  }

  /**
   * Deletes a post with ownership validation
   * @param id - Post ID
   * @param authorId - ID of the requesting user
   * @throws Error if post not found or user lacks permission
   */
  async deletePost(id: string, authorId: string): Promise<void> {
    const existingPost = await this.prisma.post.findFirst({
      where: {
        id,
        authorId,
      },
    });

    if (!existingPost) {
      throw new Error('Post not found or you do not have permission to delete it');
    }

    await this.prisma.post.delete({
      where: { id },
    });
  }

  /**
   * Retrieves paginated list of all posts with author information
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Paginated post list with metadata
   */
  async getAllPosts(
    page = 1,
    limit = 10
  ): Promise<{
    posts: Post[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: true,
        },
      }),
      this.prisma.post.count(),
    ]);

    return {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Retrieves paginated posts by specific author
   * @param authorId - Author's user ID
   * @param page - Page number (default: 1)
   * @param limit - Items per page (default: 10)
   * @returns Paginated post list for the author
   */
  async getPostsByAuthor(
    authorId: string,
    page = 1,
    limit = 10
  ): Promise<{
    posts: Post[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { authorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: true,
        },
      }),
      this.prisma.post.count({
        where: { authorId },
      }),
    ]);

    return {
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
