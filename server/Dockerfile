# Build stage: install all workspace dependencies
FROM node:22-alpine AS build

WORKDIR /app

# Copy root workspace config and lockfile
COPY package.json package-lock.json ./

# Copy workspace package.json files (needed for npm install --workspaces)
COPY packages/core/package.json packages/core/
COPY server/package.json server/
COPY patterns/router/package.json patterns/router/
COPY patterns/pipeline/package.json patterns/pipeline/
COPY patterns/supervisor/package.json patterns/supervisor/
COPY patterns/debate/package.json patterns/debate/

# Install all dependencies (production + dev for tsx)
RUN npm ci

# Copy source code for workspaces the server needs
COPY packages/core/ packages/core/
COPY server/ server/
COPY patterns/ patterns/
COPY tsconfig.base.json tsconfig.json ./

# Run stage: slim image with source + deps
FROM node:22-slim

WORKDIR /app

# Copy everything from build stage (source + node_modules)
COPY --from=build /app ./

EXPOSE 3001

# Run with tsx (TypeScript execution without compilation)
CMD ["npx", "tsx", "server/src/index.ts"]
