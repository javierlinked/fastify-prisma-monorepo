# ========================================
# BUILD STAGE
# ========================================
# Use ARG for flexibility, defaulting to linux/amd64
ARG TARGETPLATFORM=linux/amd64
FROM --platform=$TARGETPLATFORM node:20-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files for better Docker layer caching
COPY package.json yarn.lock ./
COPY packages/api/package.json ./packages/api/
COPY packages/services/package.json ./packages/services/
COPY packages/utilities/package.json ./packages/utilities/
COPY packages/types/package.json ./packages/types/

# Install ALL dependencies (including devDependencies for building)
RUN yarn install --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY tsconfig.json ./

# Generate Prisma client
RUN yarn workspace @asafe/services db:generate

# Build the application
RUN yarn build

# ========================================
# PRODUCTION STAGE
# ========================================
ARG TARGETPLATFORM=linux/amd64
FROM --platform=$TARGETPLATFORM node:20-alpine AS production

# Install runtime dependencies only
RUN apk add --no-cache curl dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
COPY packages/api/package.json ./packages/api/
COPY packages/services/package.json ./packages/services/
COPY packages/utilities/package.json ./packages/utilities/
COPY packages/types/package.json ./packages/types/

# Install ONLY production dependencies
RUN yarn install --frozen-lockfile --production && yarn cache clean

# Copy built application from builder stage
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/services/dist ./packages/services/dist
COPY --from=builder /app/packages/utilities/dist ./packages/utilities/dist
COPY --from=builder /app/packages/types/dist ./packages/types/dist

# Copy Prisma client and schema
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY packages/services/prisma/schema.prisma ./packages/services/prisma/

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["yarn", "start"]
