import { config as carregarEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';

// Os testes e2e rodam contra o banco de teste. Carregar o .env.test aqui faz
// com que a DATABASE_URL de teste esteja em process.env antes de a aplicacao
// subir -- e, no @nestjs/config, process.env tem precedencia sobre o .env.
carregarEnv({ path: '.env.test', quiet: true });

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/global-setup.ts'],
    // O banco de teste e compartilhado: os arquivos rodam em sequencia para
    // que um nao apague os dados preparados pelo outro.
    fileParallelism: false,
  },
});
