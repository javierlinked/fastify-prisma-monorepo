# Deployment Guide

## Production Build

```bash
yarn clean
yarn build
```

## Docker Support

A Dockerfile is included for container deployment:

```bash
docker build -t fastify-prisma-monorepo .
docker run -p 3000:3000 fastify-prisma-monorepo
```

## Environment Variables

Copy the example environment file and configure with your credentials:

```bash
cp .env.example .env
```

Required environment variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database_name?schema=public

# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# Server Configuration
PORT=3000
HOST=0.0.0.0

# File Upload Configuration
MAX_FILE_SIZE=5242880

# AWS S3 Configuration
AWS_REGION=eu-north-1
AWS_S3_BUCKET_NAME=your-s3-bucket-name
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
```

## Docker Compose

For development with PostgreSQL:

```bash
docker-compose up
```

For local development:

```bash
docker-compose -f docker-compose.local.yml up
```
