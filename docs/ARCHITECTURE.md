# Architecture Documentation

## Package Dependencies

The packages have the following dependency hierarchy:

```
api
├── services
│   ├── utilities
│   └── types
├── utilities
│   └── types
└── types

services
├── utilities
└── types

utilities
└── types

types
(no internal dependencies)
```

## Package Details

### @asafe/types
Contains shared TypeScript interfaces and types:
- User and Post models
- API request/response types
- Re-exports of Prisma-generated types

### @asafe/utilities
Shared utility functions:
- File upload utilities with FileUploadService
- S3 integration via S3Service
- File validation and security
- Upload handling with flexible configuration

### @asafe/services
Business logic services with dependency injection:
- UserService: User management and authentication operations
- PostService: Post CRUD operations with notifications
- NotificationService: Real-time WebSocket notification system
- DatabaseService: Singleton service for Prisma access
- Container: TSyringe configuration for DI

### @asafe/api
Main Fastify API server with modern architecture:
- REST API endpoints with Zod validation
- WebSocket support for real-time notifications
- JWT authentication middleware with roles
- Automatic Swagger documentation
- File upload handling with AWS S3
- Dependency injection with TSyringe
- Centralized error handling
