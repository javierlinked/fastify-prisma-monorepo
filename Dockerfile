FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
COPY packages/api/package.json ./packages/api/
COPY packages/services/package.json ./packages/services/
COPY packages/utilities/package.json ./packages/utilities/
COPY packages/types/package.json ./packages/types/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN yarn workspace @asafe/services db:generate

# Build the application
RUN yarn build

# Note: No longer creating uploads directory - files are now stored in S3

# Expose port
EXPOSE 3000

# Install curl for health checks
RUN apk add --no-cache curl

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["yarn", "start"]
