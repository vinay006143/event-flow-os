import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 120000,
    hookTimeout: 120000,
    include: ['tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      USE_IN_MEMORY_MONGO: 'true',
      PAYMENT_PROVIDER_MODE: 'development',
      WHATSAPP_PROVIDER_MODE: 'development',
      EMAIL_PROVIDER_MODE: 'development',
      STORAGE_PROVIDER_MODE: 'local',
      LOCAL_STORAGE_PATH: './tmp-test-storage',
    },
  },
});
