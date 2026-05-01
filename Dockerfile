# --- Build Stage ---
FROM node:22-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY . .

# Install everything and build
RUN pnpm install --frozen-lockfile

# Generate Prisma Client (Standard location: node_modules/.prisma/client)
RUN cd packages/database && DATABASE_URL="postgresql://dummy" pnpm exec prisma generate

# Build the NestJS server
RUN pnpm --filter server build

# --- Production Stage ---
FROM node:22-slim AS runner
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy the ENTIRE built workspace from builder
# This ensures all node_modules, Prisma engines, and symlinks are preserved exactly as they were built
COPY --from=builder /app /app

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start the server
CMD ["pnpm", "--filter", "server", "start:prod"]
