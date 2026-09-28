import { config as carregarEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

carregarEnv({ quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.ts',
  },
});
