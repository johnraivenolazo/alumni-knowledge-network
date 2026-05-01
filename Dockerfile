# Base Image
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Builder Stage
FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN cd packages/database && npx prisma generate

# Build the server
RUN pnpm --filter server build

# Production Stage
FROM base AS runner
WORKDIR /app

# Copy production dependencies and builds
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/package.json ./server/package.json
COPY --from=builder /app/packages/database ./packages/database
COPY --from=builder /app/package.json ./package.json

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start the server
CMD ["node", "server/dist/main"]
