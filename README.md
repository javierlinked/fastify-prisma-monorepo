# Fastify-Prisma-Monorepo

Technical Test: Node.js Developer with TypeScript, Fastify, Prisma, and Yarn Monorepo

<!-- ## Live Deployment

The application is deployed and available at:

- **API**: http://fastify-api-alb-2001389992.eu-north-1.elb.amazonaws.com/
- **Swagger Documentation**: http://fastify-api-alb-2001389992.eu-north-1.elb.amazonaws.com/docs

### Test Credentials

To test the API, you can use these credentials:

- **Email**: usuario@prueba.com
- **Password**: unodostres -->

## Architecture

This monorepo contains multiple packages working together to create a complete API solution:

```
packages/
├── types/          # Shared TypeScript types and interfaces
├── utilities/      # Shared utility functions
├── services/       # Business logic services
└── api/           # Main Fastify API server
```

## Tech Stack

### Backend Framework
- **Fastify** - Fast and efficient web framework for Node.js
- **TypeScript** - Static typing for better safety and productivity
- **Zod** - Schema validation and type-safe serialization

### Database
- **PostgreSQL** - Robust relational database
- **Prisma** - Modern ORM with type-safety and migrations

### Architecture & Patterns
- **TSyringe** - Dependency injection with decorators
- **Monorepo** - Multi-package management with Yarn Workspaces
- **Dependency Inversion** - Interfaces for decoupling

### Storage & Files
- **AWS S3** - Cloud file storage
- **Multipart Upload** - File handling with validation

### Real-time & Communication
- **WebSockets** - Real-time notifications
- **JWT** - Secure stateless authentication

### Testing & Quality
- **Jest** - Testing framework with mocks
- **Biome** - Fast linting and formatting
- **Docker** - Containerization for development and production

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- Yarn (for workspace management)
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone https://github.com/javierlinked/fastify-prisma-monorepo
cd fastify-prisma-monorepo
```

2. Install dependencies:
```bash
yarn install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env file with your database and AWS credentials
```

4. Generate Prisma client:
```bash
yarn db:generate
```

5. Run database migrations:
```bash
yarn db:migrate
```

## Development

### Start Development Server

```bash
yarn dev
```

This starts the API server with hot reload using `tsx watch`.

### Build All Packages

The build process follows the correct dependency order:

```bash
yarn build
```

This executes:
1. `yarn build:types` - Build shared types
2. `yarn build:utilities` - Build utility functions  
3. `yarn build:services` - Build business logic services
4. `yarn build:api` - Build main API server

### Testing

```bash
# Run all tests
yarn test

# Run tests for specific package
yarn workspace @asafe/api test
yarn workspace @asafe/services test
yarn workspace @asafe/utilities test
```

### Code Quality

```bash
# Check linting and format issues
yarn check

# Fix all issues
yarn fix
```

## Database Management

```bash
# Generate Prisma client
yarn db:generate

# Run migrations
yarn db:migrate

# Open Prisma Studio
yarn db:studio
```

## Documentation

📖 **Detailed Documentation:**
- [Architecture](docs/ARCHITECTURE.md) - System architecture and package details
- [API Documentation](docs/API.md) - Endpoints and WebSocket features
- [Deployment Guide](docs/DEPLOYMENT.md) - Production deployment instructions

## TODO

- [x] Dependency injection with TSyringe
- [x] Centralized environment variables
- [x] Singleton services with decorators
- [x] Interfaces for abstractions
- [x] File uploads to S3
- [x] WebSocket with JWT authentication
- [ ] Rate limiting for APIs
- [ ] Improve file handling in users PUT
- [ ] Implement caching with Redis
- [ ] Structured logging with context
- [ ] Metrics and monitoring
- [ ] Complete integration tests
- [ ] Automated CI/CD pipeline

## License

[MIT License](LICENSE)
