// Prisma config for CLI commands (migrate, generate, db push)
// URL is required in Prisma 7 — removed from schema.prisma
import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
