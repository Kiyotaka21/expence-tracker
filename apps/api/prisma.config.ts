import 'dotenv/config';

import { defineConfig, env } from 'prisma/config';

// В Prisma 7 строка подключения задаётся здесь, а не в schema.prisma.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
