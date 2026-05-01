# --- Base Stage ---
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# --- Build Stage ---
FROM base AS builder
# Copy only files needed for install to leverage Docker cache
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/database/package.json ./packages/database/
COPY server/package.json ./server/package.json

# Install ALL dependencies (including devDeps for build)
RUN pnpm install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Generate Prisma Client (Custom output is in packages/database/dist-client)
RUN cd packages/database && DATABASE_URL="postgresql://dummy" npx prisma generate

# Build the NestJS server
RUN pnpm --filter server build

# --- Deploy Stage (Isolate production dependencies) ---
FROM base AS deployer
# This command creates a standalone folder with only prod dependencies
RUN pnpm deploy --filter=server --prod /app/out

# Manually copy the built server dist and generated prisma client into the isolated folder
# pnpm deploy usually doesn't include the 'dist' folder if it's ignored or not part of the package
COPY --from=builder /app/server/dist /app/out/dist
COPY --from=builder /app/packages/database/dist-client /app/out/node_modules/@akn/database/dist-client

# --- Final Production Stage ---
FROM node:22-slim AS runner
WORKDIR /app

# Copy the isolated output from deployer
COPY --from=deployer /app/out ./

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start the server directly using node
CMD ["node", "dist/main.js"]
