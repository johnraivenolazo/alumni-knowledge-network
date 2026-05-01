# --- Build Stage ---
FROM node:22-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app
COPY . .

# Install everything and build
RUN pnpm install --frozen-lockfile
RUN cd packages/database && DATABASE_URL="postgresql://dummy" pnpm exec prisma generate
RUN pnpm --filter server build

# --- Production Stage ---
FROM node:22-slim AS runner
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy the entire workspace from builder
COPY --from=builder /app /app

# Clean up dev dependencies to keep it as lean as possible while preserving workspace structure
RUN pnpm install --prod --frozen-lockfile

# Set environment
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Use pnpm to start the server to ensure workspace paths are resolved correctly
CMD ["pnpm", "--filter", "server", "start:prod"]
