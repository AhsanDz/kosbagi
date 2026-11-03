// Titik masuk server HTTP: npm run dev (src/) atau npm start (dist/).
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const app = await createApp();

const server = app.listen(env.PORT, (error?: Error) => {
  if (error) {
    logger.fatal({ err: error }, `Server gagal berjalan di port ${env.PORT}`);
    process.exit(1);
  }
  logger.info(`API KosBagi berjalan di http://localhost:${env.PORT} (mode ${env.NODE_ENV})`);
});

// Penutupan rapi: berhenti menerima permintaan baru, selesaikan yang sedang berjalan,
// lalu tutup koneksi basis data. Bila macet lebih dari 10 detik, paksa keluar.
function shutdown(signal: NodeJS.Signals): void {
  logger.info(`Menerima ${signal}, menutup server...`);
  setTimeout(() => process.exit(1), 10_000).unref();
  server.close((error) => {
    prisma
      .$disconnect()
      .catch((disconnectError: unknown) => logger.error({ err: disconnectError }, 'Gagal menutup koneksi basis data'))
      .finally(() => process.exit(error ? 1 : 0));
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
