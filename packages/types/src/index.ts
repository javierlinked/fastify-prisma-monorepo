import { z } from 'zod';

const commonFields = {
  email: z.string().email('Invalid email format'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  optionalString: z.string().optional(),
  postTitle: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  postContent: z.string().min(1, 'Content is required'),
  notificationType: z.enum(['NEW_POST', 'USER_UPDATE', 'SYSTEM']),
};

const createPaginatedResponse = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    }),
  });

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface UserWithoutPassword extends Omit<User, 'password'> {}

export interface NotificationPayload {
  type: 'NEW_POST' | 'USER_UPDATE' | 'SYSTEM';
  message: string;
  userId?: string;
  data?: any;
}

export const updateUserSchema = z.object({
  username: commonFields.username.optional(),
  firstName: commonFields.optionalString,
  lastName: commonFields.optionalString,
  profilePicture: commonFields.optionalString,
});

export interface UpdateUserRequest extends z.infer<typeof updateUserSchema> {}

export const baseUserSchema = z.object({
  email: commonFields.email,
  username: commonFields.username,
  password: commonFields.password,
  firstName: commonFields.optionalString,
  lastName: commonFields.optionalString,
});

export const registerSchema = baseUserSchema;
export const createUserSchema = baseUserSchema;

export const createPostSchema = z.object({
  title: commonFields.postTitle,
  content: commonFields.postContent,
});

export interface CreatePostRequest extends z.infer<typeof createPostSchema> {}

export interface CreateUserRequest extends z.infer<typeof createUserSchema> {}

export const updatePostSchema = z.object({
  title: commonFields.postTitle.optional(),
  content: commonFields.postContent.optional(),
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
  email: commonFields.email,
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

export const paginatedUsersResponseSchema = createPaginatedResponse(userSchema);

export const paginatedPostsResponseSchema = createPaginatedResponse(postSchema);

export const profilePictureUploadResponseSchema = z.object({
  message: z.string(),
  profilePicture: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    profilePicture: z.string(),
  }),
});

const baseNotificationSchema = z.object({
  type: commonFields.notificationType,
  message: z.string(),
  data: z.record(z.string(), z.any()).optional(),
});

export const sendNotificationRequestSchema = baseNotificationSchema;

export const broadcastRequestSchema = baseNotificationSchema.extend({
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
  statusCode: z.number(),
  details: z.any().optional(),
});

export const fileUploadSchema = z.object({
  file: z.file().refine(val => val !== undefined, {
    message: 'File is required',
  }),
});

export const s3UploadResultSchema = z.object({
  key: z.string(),
  url: z.string(),
  etag: z.string(),
  location: z.string(),
});

export interface S3UploadResult extends z.infer<typeof s3UploadResultSchema> {}

export const awsConfigSchema = z.object({
  region: z.string(),
  bucketName: z.string(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
});

export interface AWSConfig extends z.infer<typeof awsConfigSchema> {}

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
