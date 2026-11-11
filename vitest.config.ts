import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/game/**/*.test.ts', 'tests/ui/**/*.test.ts'],
  },
});
