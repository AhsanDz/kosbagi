// Alamat layanan untuk test integrasi. Bawaan cocok dengan docker-compose.yml.
export const TEST_DATABASE_URL =
  process.env['TEST_DATABASE_URL'] ?? 'postgresql://kosbagi:kosbagi@localhost:5432/kosbagi_test?schema=public';

export const TEST_REDIS_URL = process.env['TEST_REDIS_URL'] ?? 'redis://localhost:6379';
