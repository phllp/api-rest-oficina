import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolve os aliases de caminho declarados no tsconfig.json.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
