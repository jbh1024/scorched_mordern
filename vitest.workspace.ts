import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'shared',
      root: './packages/shared',
      include: ['src/**/*.test.ts'],
    },
  },
  {
    test: {
      name: 'server',
      root: './packages/server',
      include: ['src/**/*.test.ts'],
    },
  },
  {
    resolve: {
      alias: {
        '@scorched/shared': new URL('./packages/shared/src', import.meta.url).pathname,
      },
    },
    test: {
      name: 'client',
      root: './packages/client',
      include: ['src/**/*.test.ts'],
    },
  },
]);
