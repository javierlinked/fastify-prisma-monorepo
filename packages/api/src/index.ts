import 'reflect-metadata';
import { container, DatabaseService } from '@asafe/services';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { authMiddleware } from './middleware/auth';
import authRoutes from './routes/auth';
import notificationRoutes from './routes/notifications';
import postRoutes from './routes/posts';
import uploadRoutes from './routes/upload';
import userRoutes from './routes/users';
import { handleError } from './utils/errorHandling';

const port = Number.parseInt(process.env.PORT || '3000');
const host = process.env.HOST || '0.0.0.0';

const app = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
    },
  },
}).withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

async function registerPlugins() {
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  });

  await app.register(multipart);

  await app.register(websocket);

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'ASafe API',
        description: 'Technical Test API with TypeScript, Fastify, and Prisma',
        version: '1.0.0',
      },
      servers: [],
      components: {
        securitySchemes: {
          Bearer: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });
}

async function registerRoutes() {
  app.decorate('authenticate', authMiddleware);

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(postRoutes, { prefix: '/api/posts' });
  await app.register(uploadRoutes, { prefix: '/api/upload' });
  await app.register(notificationRoutes, { prefix: '/api/notifications' });
}

app.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

app.setErrorHandler((error, request, reply) => {
  handleError(error, reply, request);
});

async function start() {
  try {
    await registerPlugins();
    await registerRoutes();

    await app.listen({ port, host });
    app.log.info(`Server running on http://${host}:${port}`);
    app.log.info(`API Documentation available at http://${host}:${port}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  app.log.info('Received SIGINT, shutting down gracefully');
  const databaseService = container.resolve(DatabaseService);
  await databaseService.disconnect();
  await app.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  app.log.info('Received SIGTERM, shutting down gracefully');
  const databaseService = container.resolve(DatabaseService);
  await databaseService.disconnect();
  await app.close();
  process.exit(0);
});

if (require.main === module) {
  start();
}

export default app;
