# API Documentation

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user
- `POST /auth/refresh` - Refresh token

### Users
- `GET /users` - List users
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Posts
- `GET /posts` - List posts
- `POST /posts` - Create post
- `GET /posts/:id` - Get post by ID
- `PUT /posts/:id` - Update post
- `DELETE /posts/:id` - Delete post

### File Upload
- `POST /api/upload` - Upload file (requires authentication)
  - Supports images: JPEG, PNG, GIF, WebP
  - MIME type and extension validation
  - Direct upload to AWS S3
  - Automatic user profile update

### Notifications (WebSocket)
- `GET /notifications/ws` - WebSocket connection
- `POST /notifications/send/:userId` - Send notification
- `POST /notifications/broadcast` - Broadcast notification

## Real-time Notifications

The project includes a complete real-time notification system using WebSockets:

### Key Features

- JWT-authenticated WebSocket connections
- Automatic connection management with periodic cleanup
- Automatic events integrated into business logic
- Test client included (`test-ws.html`) - for local use, connects to AWS instance (or local)

### Supported Events

- NEW_POST: Sent when a user creates a new post (to everyone except the author)
- USER_UPDATE: Sent when a user updates their profile or photo
- SYSTEM: System messages and connection confirmations

### Administrative Endpoints

- `GET /api/notifications/connected` - List connected users
- `GET /api/notifications/status/:userId` - User connection status
- `POST /api/notifications/send/:userId` - Send specific notification
- `POST /api/notifications/broadcast` - Broadcast to all users

## Security Features

- JWT authentication with user roles (USER/ADMIN)
- Password hashing with bcrypt and configurable salt rounds
- Strict input validation with Zod schemas
- CORS configuration enabled for development
- Role-based authorization middleware
- File validation with allowed MIME types and extensions
- Uploaded filename sanitization
- Centralized and secure environment variables

## Interactive Documentation

Once the server is running, you can access:

- **API Documentation**: http://localhost:3000/docs
- **Health Check**: http://localhost:3000/health
