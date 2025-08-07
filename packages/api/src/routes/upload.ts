import { container, UserService } from '@asafe/services';
import {
  errorResponseSchema,
  fileUploadSchema,
  profilePictureUploadResponseSchema,
} from '@asafe/types';
import { FileUploadService } from '@asafe/utilities';
import { FastifyPluginAsync } from 'fastify';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { sendErrorResponse } from '../utils/errorHandling';

const uploadRoutes: FastifyPluginAsync = async fastify => {
  fastify.setValidatorCompiler(() => () => ({}));

  const awsRegion = process.env.AWS_REGION || 'eu-north-1';
  const awsBucketName = process.env.AWS_S3_BUCKET_NAME || 'asafe-uploads-dev';
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!awsBucketName) {
    throw new Error('AWS_S3_BUCKET_NAME environment variable is required');
  }
  if (!awsAccessKeyId || !awsSecretAccessKey) {
    throw new Error(
      'AWS credentials (AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY) environment variables are required'
    );
  }

  const s3Config = {
    region: awsRegion,
    bucketName: awsBucketName,
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey,
  };

  const uploadService = new FileUploadService({
    s3Config,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  });

  fastify.post(
    '/file',
    {
      preHandler: [requireAuth()],
      schema: {
        tags: ['Upload'],
        security: [{ Bearer: [] }],
        consumes: ['multipart/form-data'],
        body: fileUploadSchema,
        response: {
          200: profilePictureUploadResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
          500: errorResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const user = (request as AuthenticatedRequest).user;

      try {
        const data = await request.file();

        if (!data) {
          return sendErrorResponse(reply, 400, 'Bad Request', 'No file uploaded');
        }

        const uploadResult = await uploadService.uploadFile(data, `profile-${user.id}`);

        const profilePictureUrl = uploadResult.s3Url || uploadResult.path;

        const userService = container.resolve(UserService);
        const updatedUser = await userService.updateUser(user.id, {
          profilePicture: profilePictureUrl,
        });

        return {
          message: 'Profile picture uploaded successfully',
          profilePicture: profilePictureUrl,
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            profilePicture: updatedUser.profilePicture,
          },
        };
      } catch (err: any) {
        fastify.log.error(err);

        if (err.message.includes('File size exceeds') || err.message.includes('not allowed')) {
          return sendErrorResponse(reply, 400, 'Bad Request', err.message);
        }

        if (err.message.includes('AWS') || err.message.includes('S3')) {
          fastify.log.error('S3 upload error:', err);
          return reply.status(500).send({
            error: 'Upload Service Error',
            message: 'Failed to upload file to storage service',
            statusCode: 500,
          });
        }

        return reply.status(500).send({
          error: 'Internal Server Error',
          message: 'Failed to upload file',
          statusCode: 500,
        });
      }
    }
  );
};

export default uploadRoutes;
