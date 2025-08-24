import 'reflect-metadata';
import { container } from 'tsyringe';
import { DatabaseService } from './databaseService';
import { IDatabaseService, INotificationService } from './interfaces';
import { NotificationService } from './notificationService';
import { PostService } from './postService';
import { S3Config, UserService } from './userService';

// Register database service
container.register<IDatabaseService>('IDatabaseService', {
  useClass: DatabaseService,
});

// Register notification service
container.register<INotificationService>('INotificationService', {
  useClass: NotificationService,
});

// Register S3 configuration
const s3Config: S3Config = {
  region: process.env.AWS_REGION || 'eu-north-1',
  bucketName: process.env.AWS_S3_BUCKET_NAME || 'asafe-uploads-dev',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

container.register<S3Config>('S3Config', {
  useValue: s3Config,
});

// Register services with constructor dependencies
container.register(UserService, {
  useFactory: container => {
    const databaseService = container.resolve<IDatabaseService>('IDatabaseService');
    const notificationService = container.resolve<INotificationService>('INotificationService');
    const s3Config = container.resolve<S3Config>('S3Config');
    return new UserService(databaseService, notificationService, s3Config);
  },
});

container.register(PostService, {
  useFactory: container => {
    const databaseService = container.resolve<IDatabaseService>('IDatabaseService');
    const notificationService = container.resolve<INotificationService>('INotificationService');
    return new PostService(databaseService, notificationService);
  },
});

export { container };
