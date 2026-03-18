# Build stage: install deps and build with Vite
FROM node:22-alpine AS build

WORKDIR /app

# Copy root workspace config and lockfile
COPY package.json package-lock.json ./

# Copy workspace package.json files needed for install
COPY frontend/package.json frontend/
COPY packages/core/package.json packages/core/
COPY server/package.json server/
COPY patterns/router/package.json patterns/router/
COPY patterns/pipeline/package.json patterns/pipeline/
COPY patterns/supervisor/package.json patterns/supervisor/
COPY patterns/debate/package.json patterns/debate/

# Install all dependencies
RUN npm ci

# Copy frontend source and core types (frontend has type-only imports from core)
COPY frontend/ frontend/
COPY packages/core/ packages/core/
COPY tsconfig.base.json tsconfig.json ./

# Build the frontend
RUN npm run build --workspace=frontend

# Serve stage: nginx with built assets
FROM nginx:alpine

# Copy built files to nginx html directory
COPY --from=build /app/frontend/dist /usr/share/nginx/html

# Copy custom nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
