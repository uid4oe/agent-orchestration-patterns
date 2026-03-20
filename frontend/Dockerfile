FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

COPY frontend/package.json frontend/
COPY packages/core/package.json packages/core/
COPY server/package.json server/
COPY patterns/router/package.json patterns/router/
COPY patterns/pipeline/package.json patterns/pipeline/
COPY patterns/supervisor/package.json patterns/supervisor/
COPY patterns/debate/package.json patterns/debate/
COPY patterns/swarm/package.json patterns/swarm/
COPY patterns/map-reduce/package.json patterns/map-reduce/
COPY patterns/reflection/package.json patterns/reflection/

RUN npm ci

COPY frontend/ frontend/
COPY packages/core/ packages/core/
COPY tsconfig.base.json tsconfig.json ./

RUN npm run build --workspace=frontend

FROM nginx:alpine

LABEL org.opencontainers.image.source=https://github.com/uid4oe/agent-orchestration-patterns
LABEL org.opencontainers.image.description="Agent Orchestration Patterns - Frontend"

COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
