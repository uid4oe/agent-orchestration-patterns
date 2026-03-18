# Step 6: Docker

**Agent:** `docker-builder`
**Branch:** `feat/docker`
**Depends on:** Steps 1-4 (needs working code to containerize)

## Implementation

### 6.1 .dockerignore

**Commit:** `chore: add .dockerignore`

### 6.2 Server Dockerfile

Multi-stage build. Must include core + all patterns since server loads them.

**Commit:** `chore: add server Dockerfile`

### 6.3 Frontend Dockerfile

Multi-stage: Vite build → nginx. Include nginx config for SPA fallback + API proxy.

**Commit:** `chore: add frontend Dockerfile with nginx`

### 6.4 docker-compose.yml

- `server` + `frontend` as default services
- `postgres` + `langfuse` behind `langfuse` profile

**Commit:** `chore: add docker-compose with Langfuse profile`

## Done When

- [ ] `docker compose up` starts server + frontend
- [ ] `docker compose --profile langfuse up` includes Langfuse
- [ ] Frontend at :3000, Langfuse at :3002
