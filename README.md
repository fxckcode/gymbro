# Gymbro API

Backend API for the Gymbro whitelabel platform, built with NestJS.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | NestJS 11 |
| Language | TypeScript 5.7 |
| ORM | Prisma 7 |
| Database | PostgreSQL 16 + pgvector |
| Cache | Redis 7 |
| API Docs | Swagger / OpenAPI |
| Testing | Jest 30 + Supertest |
| Package Manager | pnpm |

## Prerequisites

- [Node.js 22](https://nodejs.org)
- [pnpm](https://pnpm.io) — `npm install -g pnpm`
- [Docker](https://www.docker.com)

## Local Setup

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd gymbro

# 2. Set up environment variables
cp .env.example .env

# 3. Install dependencies
pnpm install

# 4. Start database and Redis
docker compose up db redis -d

# 5. Generate Prisma client
npx prisma generate

# 6. Start development server
pnpm start:dev
```

The API will be available at `http://localhost:3000`.

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm start:dev` | Start with hot reload |
| `pnpm start:debug` | Start with debugger on port 9229 |
| `pnpm start:prod` | Start compiled production build |
| `pnpm build` | Compile TypeScript to `dist/` |
| `pnpm lint` | Run ESLint with auto-fix |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:cov` | Run tests with coverage report |
| `pnpm test:e2e` | Run end-to-end tests |

## Docker

### Full stack (production build)

```bash
docker compose up
```

Starts app (production image), PostgreSQL, and Redis. All services include health checks.

### Development with hot reload

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Mounts source code as a volume and runs `pnpm start:dev` inside the container.

### Individual services

```bash
docker compose up db redis -d   # Only database + Redis (for local dev)
docker compose down             # Stop and remove containers
docker compose down -v          # Stop and remove containers + volumes
```

## API Reference

| Endpoint | Description | Availability |
|----------|-------------|-------------|
| `GET /health` | Health check with DB connectivity | Always |
| `GET /api/docs` | Swagger UI | Development only |
| `GET /api/docs-json` | OpenAPI JSON spec | Development only |

## Git Conventions

This repository enforces [Conventional Commits](https://www.conventionalcommits.org).
The `commit-msg` hook will reject any commit that doesn't follow the format:

```
<type>(<scope>): <description>

feat(auth): add JWT middleware
fix(health): handle DB timeout
chore(deps): update nestjs to v11
```

| Type | Use for |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Maintenance, dependency updates |
| `docs` | Documentation changes |
| `refactor` | Code refactor without behavior change |
| `test` | Adding or updating tests |
| `perf` | Performance improvements |
| `ci` | CI/CD changes |
| `build` | Build system changes |
| `style` | Code style (formatting, semicolons) |
