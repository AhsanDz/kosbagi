// Proses worker blockchain, terpisah dari server API (src/server.ts). Isinya dua pekerjaan:
// 1. Dispatcher outbox: memindahkan baris outbox_jobs yang ditulis webhook dan persetujuan KYC ke
//    antrean BullMQ.
// 2. Worker BullMQ: mengambil job satu per satu dan mengirim transaksinya ke KosToken atau KosLedger
//    lewat dompet operator.
//
// Menjalankan (dari folder backend/): npm run worker, atau npx tsx src/worker.ts.
// Worker menolak jalan bila konfigurasi blockchain kosong atau salah, bila RPC menunjuk jaringan
// selain CHAIN_ID, bila alamat kontrak bukan KosToken dan KosLedger, atau bila worker lain sudah jalan.
import { redactSecrets } from './blockchain/errors.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

/** Batas waktu berhenti rapi. Lewat dari ini proses dihentikan paksa. */
const SHUTDOWN_TIMEOUT_MS = 30_000;

async function main(): Promise<void> {
  // Diimpor dinamis supaya kesalahan konfigurasi tampil sebagai pesan biasa, bukan stack trace.
  const { loadBlockchainConfig } = await import('./blockchain/config.js');
  const { startBlockchainWorker } = await import('./blockchain/worker-runtime.js');

  const config = loadBlockchainConfig();
  let shuttingDown = false;
  let running: Awaited<ReturnType<typeof startBlockchainWorker>> | undefined;

  const shutdown = async (reason: string, exitCode: number): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ reason }, 'Worker diminta berhenti');
    const forceExit = setTimeout(() => {
      logger.error({}, 'Worker tidak berhenti dalam batas waktu, dihentikan paksa');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();
    try {
      await running?.stop();
      await prisma.$disconnect();
    } catch (error) {
      logger.error({ err: error instanceof Error ? error.message : String(error) }, 'Worker gagal berhenti rapi');
      exitCode = 1;
    }
    process.exit(exitCode);
  };

  // SIGINT: Ctrl+C. SIGTERM: Railway, Render, Docker, tsx watch. SIGBREAK: Ctrl+Break di Windows.
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGBREAK'] as const) {
    process.on(signal, () => void shutdown(signal, 0));
  }

  running = await startBlockchainWorker({
    config,
    onFatal: (error) => {
      logger.error({ err: error.message }, 'Worker harus berhenti');
      void shutdown('fatal', 1);
    },
  });
  if (shuttingDown) await running.stop();
}

main().catch(async (error: unknown) => {
  // Pesan pemeriksaan awal sudah berbahasa Indonesia. Nilai rahasia tetap disaring untuk berjaga-jaga.
  const secrets = ['OPERATOR_PRIVATE_KEY', 'CUSTODIAL_WALLET_MNEMONIC', 'SEPOLIA_RPC_URL', 'SEPOLIA_RPC_URL_FALLBACK'].map(
    (name) => process.env[name],
  );
  const message = redactSecrets(error instanceof Error ? error.message : String(error), secrets);
  logger.fatal({ err: message }, 'Worker blockchain tidak bisa dijalankan');
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
