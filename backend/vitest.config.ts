import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Unit test di samping kode (src/**/*.test.ts), test HTTP tanpa basis data di tests/.
    // Test yang butuh PostgreSQL dan Redis ada di tests/integration, dijalankan terpisah
    // dengan npm run test:integration (vitest.integration.config.ts).
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['tests/integration/**', '**/node_modules/**'],
    // Nilai environment khusus test, dipasang sebelum kode aplikasi dimuat.
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      CORS_ORIGIN: 'http://localhost:3000',
      // Sengaja menunjuk port yang tidak dipakai: test di sini tidak boleh butuh
      // PostgreSQL atau Redis yang sedang jalan.
      DATABASE_URL: 'postgresql://kosbagi:kosbagi@127.0.0.1:1/kosbagi_test?schema=public',
      REDIS_URL: 'redis://127.0.0.1:1',
      JWT_SECRET: 'nilai-khusus-test-bukan-rahasia-sungguhan',
      // Kunci rekaan. Semua panggilan ke Midtrans di test ditiru, tanpa jaringan.
      MIDTRANS_SERVER_KEY: 'SB-Mid-server-kunci-rekaan-khusus-test',
    },
  },
});
