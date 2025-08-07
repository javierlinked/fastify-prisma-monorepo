import 'reflect-metadata';
import { PostService } from '../src/postService';
import { CreatePostRequest, UpdatePostRequest } from '@asafe/types';
import { IDatabaseService, INotificationService } from '../src/interfaces';
import { setupTestContainer, cleanupTestContainer } from './testContainer';

describe('PostService', () => {
  let postService: PostService;
  let mockPrisma: any;
  let mockDatabaseService: jest.Mocked<IDatabaseService>;
  let mockNotificationService: jest.Mocked<INotificationService>;
  let testContainer: any;

  beforeEach(() => {
    const testSetup = setupTestContainer();
    testContainer = testSetup.testContainer;
    mockDatabaseService = testSetup.mockDatabaseService;
    mockNotificationService = testSetup.mockNotificationService;
    mockPrisma = testSetup.mockPrisma;

    // Resolve PostService from container
    postService = testContainer.resolve(PostService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestContainer(testContainer);
  });

  describe('createPost', () => {
    it('should create a post and send notification', async () => {
      const authorId = 'user-123';
      const postData: CreatePostRequest = {
        title: 'Test Post',
        content: 'This is a test post content',
      };

      const mockCreatedPost = {
        id: 'post-456',
        title: postData.title,
        content: postData.content,
        authorId,
        author: {
          id: authorId,
          username: 'testuser',
          email: 'test@example.com',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.post.create.mockResolvedValue(mockCreatedPost);

      const result = await postService.createPost(authorId, postData);

      expect(mockPrisma.post.create).toHaveBeenCalledWith({
        data: {
          ...postData,
          authorId,
        },
        include: {
          author: true,
        },
      });

      expect(result).toEqual(mockCreatedPost);

      // Verify notification was sent
      expect(mockNotificationService.broadcast).toHaveBeenCalledWith(
        {
          type: 'NEW_POST',
          message: 'New post created: "Test Post" by testuser',
          data: {
            postId: 'post-456',
            title: 'Test Post',
            authorId,
            authorUsername: 'testuser',
            createdAt: mockCreatedPost.createdAt,
          },
        },
        authorId // Exclude the author from broadcast
      );
    });

    it('should handle missing author information in notification', async () => {
      const authorId = 'user-123';
      const postData: CreatePostRequest = {
        title: 'Test Post',
        content: 'This is a test post content',
      };

      const mockCreatedPost = {
        id: 'post-456',
        title: postData.title,
        content: postData.content,
        authorId,
        author: null, // No author information
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.post.create.mockResolvedValue(mockCreatedPost);

      await postService.createPost(authorId, postData);

      expect(mockNotificationService.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'New post created: "Test Post" by Unknown',
          data: expect.objectContaining({
            authorUsername: undefined,
          }),
        }),
        authorId
      );
    });

    it('should still create post even if notification fails', async () => {
      const authorId = 'user-123';
      const postData: CreatePostRequest = {
        title: 'Test Post',
        content: 'This is a test post content',
      };

      const mockCreatedPost = {
        id: 'post-456',
        title: postData.title,
        content: postData.content,
        authorId,
        author: { username: 'testuser' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.post.create.mockResolvedValue(mockCreatedPost);
      mockNotificationService.broadcast.mockImplementation(() => {
        throw new Error('Notification failed');
      });

      // Suppress console.error for this test since it's expected behavior
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Should not throw error
      const result = await postService.createPost(authorId, postData);
      expect(result).toEqual(mockCreatedPost);

      // Restore console.error
      console.error = originalConsoleError;
    });
  });

  describe('getPostById', () => {
    it('should retrieve post by ID with author information', async () => {
      const postId = 'post-123';
      const mockPost = {
        id: postId,
        title: 'Test Post',
        content: 'Test content',
        authorId: 'user-123',
        author: { username: 'testuser' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.post.findUnique.mockResolvedValue(mockPost);

      const result = await postService.getPostById(postId);

      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith({
        where: { id: postId },
        include: { author: true },
      });
      expect(result).toEqual(mockPost);
    });

    it('should return null if post not found', async () => {
      const postId = 'non-existent';
      mockPrisma.post.findUnique.mockResolvedValue(null);

      const result = await postService.getPostById(postId);

      expect(result).toBeNull();
    });
  });

  describe('updatePost', () => {
    it('should update post with ownership validation', async () => {
      const postId = 'post-123';
      const authorId = 'user-123';
      const updateData: UpdatePostRequest = {
        title: 'Updated Title',
        content: 'Updated content',
      };

      const mockExistingPost = {
        id: postId,
        authorId,
        title: 'Original Title',
      };

      const mockUpdatedPost = {
        id: postId,
        title: updateData.title,
        content: updateData.content,
        authorId,
        author: { username: 'testuser' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.post.findFirst.mockResolvedValue(mockExistingPost);
      mockPrisma.post.update.mockResolvedValue(mockUpdatedPost);

      const result = await postService.updatePost(postId, authorId, updateData);

      expect(mockPrisma.post.findFirst).toHaveBeenCalledWith({
        where: { id: postId, authorId },
      });
      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: postId },
        data: updateData,
        include: { author: true },
      });
      expect(result).toEqual(mockUpdatedPost);
    });

    it('should throw error if post not found or user lacks permission', async () => {
      const postId = 'post-123';
      const authorId = 'user-123';
      const updateData: UpdatePostRequest = {
        title: 'Updated Title',
      };

      mockPrisma.post.findFirst.mockResolvedValue(null);

      await expect(postService.updatePost(postId, authorId, updateData)).rejects.toThrow(
        'Post not found or you do not have permission to update it'
      );
    });
  });

  describe('deletePost', () => {
    it('should delete post with ownership validation', async () => {
      const postId = 'post-123';
      const authorId = 'user-123';

      const mockExistingPost = {
        id: postId,
        authorId,
        title: 'Test Post',
      };

      mockPrisma.post.findFirst.mockResolvedValue(mockExistingPost);
      mockPrisma.post.delete.mockResolvedValue({});

      await postService.deletePost(postId, authorId);

      expect(mockPrisma.post.findFirst).toHaveBeenCalledWith({
        where: { id: postId, authorId },
      });
      expect(mockPrisma.post.delete).toHaveBeenCalledWith({
        where: { id: postId },
      });
    });

    it('should throw error if post not found or user lacks permission', async () => {
      const postId = 'post-123';
      const authorId = 'user-123';

      mockPrisma.post.findFirst.mockResolvedValue(null);

      await expect(postService.deletePost(postId, authorId)).rejects.toThrow(
        'Post not found or you do not have permission to delete it'
      );
    });
  });

  describe('getAllPosts', () => {
    it('should return paginated posts with metadata', async () => {
      const page = 1;
      const limit = 10;
      const mockPosts = [
        { id: 'post-1', title: 'Post 1', author: { username: 'user1' } },
        { id: 'post-2', title: 'Post 2', author: { username: 'user2' } },
      ];
      const totalCount = 25;

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.post.count.mockResolvedValue(totalCount);

      const result = await postService.getAllPosts(page, limit);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { author: true },
      });
      expect(mockPrisma.post.count).toHaveBeenCalled();

      expect(result).toEqual({
        posts: mockPosts,
        total: totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
      });
    });

    it('should handle different page numbers correctly', async () => {
      const page = 3;
      const limit = 5;
      
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      await postService.getAllPosts(page, limit);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        skip: 10, // (3-1) * 5
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { author: true },
      });
    });
  });

  describe('getPostsByAuthor', () => {
    it('should return paginated posts by specific author', async () => {
      const authorId = 'user-123';
      const page = 1;
      const limit = 10;
      const mockPosts = [
        { id: 'post-1', title: 'Post 1', authorId, author: { username: 'testuser' } },
        { id: 'post-2', title: 'Post 2', authorId, author: { username: 'testuser' } },
      ];
      const totalCount = 15;

      mockPrisma.post.findMany.mockResolvedValue(mockPosts);
      mockPrisma.post.count.mockResolvedValue(totalCount);

      const result = await postService.getPostsByAuthor(authorId, page, limit);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        where: { authorId },
        skip: 0,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { author: true },
      });
      expect(mockPrisma.post.count).toHaveBeenCalledWith({
        where: { authorId },
      });

      expect(result).toEqual({
        posts: mockPosts,
        total: totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
      });
    });
  });
});
