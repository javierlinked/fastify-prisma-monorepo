import { z } from 'zod';

export { UserRole } from '@prisma/client';

export interface UserWithoutPassword extends Omit<User, 'password'> {}

export interface NotificationPayload {
  type: 'NEW_POST' | 'USER_UPDATE' | 'SYSTEM';
  message: string;
  userId?: string;
  data?: any;
}

export const updateUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profilePicture: z.string().optional(),
});

export interface UpdateUserRequest extends z.infer<typeof updateUserSchema> {}

export const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be at most 200 characters'),
  content: z.string().min(1, 'Content is required'),
});

export interface CreatePostRequest extends z.infer<typeof createPostSchema> {}

export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export interface CreateUserRequest extends z.infer<typeof createUserSchema> {}

export const updatePostSchema = z.object({
  title: z
    .string()
    .min(1, 'Title must not be empty')
    .max(200, 'Title must be at most 200 characters')
    .optional(),
  content: z.string().min(1, 'Content must not be empty').optional(),
});

export interface UpdatePostRequest extends z.infer<typeof updatePostSchema> {}

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  role: z.string(),
  profilePicture: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export interface User extends z.infer<typeof userSchema> {}

export const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  authorId: z.string(),
  author: userSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export interface Post extends z.infer<typeof postSchema> {}

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export interface LoginRequest extends z.infer<typeof loginSchema> {}

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
});

export const userIdParamSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export const authResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});

export interface AuthResponse extends z.infer<typeof authResponseSchema> {}

export const tokenResponseSchema = z.object({
  token: z.string(),
});

export const messageResponseSchema = z.object({
  message: z.string(),
});

export const paginatedUsersResponseSchema = z.object({
  items: z.array(userSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const paginatedPostsResponseSchema = z.object({
  items: z.array(postSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export const profilePictureUploadResponseSchema = z.object({
  message: z.string(),
  profilePicture: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    profilePicture: z.string(),
  }),
});

export const sendNotificationRequestSchema = z.object({
  type: z.enum(['NEW_POST', 'USER_UPDATE', 'SYSTEM']),
  message: z.string(),
  data: z.record(z.string(), z.any()).optional(),
});

export const broadcastRequestSchema = z.object({
  type: z.enum(['NEW_POST', 'USER_UPDATE', 'SYSTEM']),
  message: z.string(),
  data: z.record(z.string(), z.any()).optional(),
  excludeUserId: z.string().optional(),
});

export const sendNotificationResponseSchema = z.object({
  message: z.string(),
  sent: z.boolean(),
  userId: z.string(),
});

export const broadcastResponseSchema = z.object({
  message: z.string(),
  sentToUsers: z.number(),
});

export const connectedUsersResponseSchema = z.object({
  connectedUsers: z.array(z.string()),
  connectionCount: z.number(),
  uniqueUsers: z.number(),
});

export const userStatusResponseSchema = z.object({
  userId: z.string(),
  isConnected: z.boolean(),
});

export const errorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number().optional(),
  details: z.any().optional(),
});

export const fileUploadSchema = z.object({
  file: z.file().refine(val => val !== undefined, {
    message: 'File is required',
  }),
});

// S3-specific response types
export const s3UploadResultSchema = z.object({
  key: z.string(),
  url: z.string(),
  etag: z.string(),
  location: z.string(),
});

export interface S3UploadResult extends z.infer<typeof s3UploadResultSchema> {}

// AWS configuration types
export const awsConfigSchema = z.object({
  region: z.string(),
  bucketName: z.string(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
});

export interface AWSConfig extends z.infer<typeof awsConfigSchema> {}

// Enhanced upload result with S3 information
export const uploadResultSchema = z.object({
  filename: z.string(),
  originalName: z.string(),
  path: z.string(),
  size: z.number(),
  mimeType: z.string(),
  s3Key: z.string().optional(),
  s3Url: z.string().optional(),
  s3ETag: z.string().optional(),
});

export interface UploadResult extends z.infer<typeof uploadResultSchema> {}

// File validation error schema
export const fileValidationErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.enum(['FILE_TOO_LARGE', 'INVALID_FILE_TYPE', 'UPLOAD_FAILED', 'S3_ERROR']),
  details: z
    .object({
      maxSize: z.number().optional(),
      allowedTypes: z.array(z.string()).optional(),
      receivedType: z.string().optional(),
      receivedSize: z.number().optional(),
    })
    .optional(),
});

export interface FileValidationError extends z.infer<typeof fileValidationErrorSchema> {}
