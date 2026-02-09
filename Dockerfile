# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++ openssl
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY nest-cli.json tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY src ./src
COPY prisma ./prisma
ARG DATABASE_URL="postgresql://postgres:postgres@db:5432/gymbro?schema=public"
ENV DATABASE_URL=${DATABASE_URL}
RUN pnpm prisma generate --schema prisma/schema.prisma
RUN pnpm build

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true
RUN apk add --no-cache openssl
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
