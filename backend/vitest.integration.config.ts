// Test integrasi dengan PostgreSQL dan Redis sungguhan: npm run test:integration.
// Butuh Docker (npm run db:up). Memakai basis data terpisah kosbagi_test yang dibuat otomatis,
// jadi data pengembangan di basis data kosbagi tidak tersentuh. Midtrans tetap ditiru.
//
// Alamat bisa diganti lewat TEST_DATABASE_URL dan TEST_REDIS_URL.
import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL, TEST_REDIS_URL } from './tests/integration/test-env.js';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['tests/integration/global-setup.ts'],
    // Semua file berbagi satu basis data dan mengosongkannya di awal tiap test.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      CORS_ORIGIN: 'http://localhost:3000',
      DATABASE_URL: TEST_DATABASE_URL,
      REDIS_URL: TEST_REDIS_URL,
      JWT_SECRET: 'nilai-khusus-test-bukan-rahasia-sungguhan',
      MIDTRANS_SERVER_KEY: 'SB-Mid-server-kunci-rekaan-khusus-test',
    },
  },
});
