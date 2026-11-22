// Modul reconciliation (ADMIN): mencocokkan setiap order Midtrans satu periode dengan basis data
// dan catatan di Sepolia.
//
//   GET /api/reconciliation?period=YYYY-MM&only=mismatch&refresh=1
//   GET /api/reconciliation/summary?period=YYYY-MM&refresh=1
//
// period bawaan periode tagihan terbaru (bulan berjalan menurut WIB bila belum ada tagihan).
// only=mismatch hanya menyaring baris; ringkasan tetap menghitung semua order. refresh=1 melewati
// cache 30 detik (tombol Periksa ulang).
//
// Semua sumber hanya dibaca: modul ini tidak pernah mengubah tagihan, pesanan, maupun job.
import { Router } from 'express';
import { KosContracts } from '../../blockchain/contracts.js';
import { createChainConnection } from '../../blockchain/provider.js';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { z } from '../../lib/zod.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { midtrans } from '../payments/midtrans.js';
import { currentWibPeriod, isPeriod, latestBillPeriod, loadDatabaseFacts } from './database.js';
import { buildReport, onlyMismatches, ReportCache } from './service.js';
import { KosContractsChainReader, type ReconciliationChainReader } from './sources.js';

const querySchema = z.object({
  period: z
    .string()
    .refine(isPeriod, 'Periode harus berformat YYYY-MM, mis. 2026-11.')
    .optional(),
  only: z.enum(['mismatch']).optional(),
  refresh: z.enum(['1', 'true']).optional(),
});

interface ChainSetup {
  key: string;
  reader: ReconciliationChainReader;
}

let chainSetup: ChainSetup | undefined;

/**
 * Pembaca kontrak dari variabel yang sama dengan worker (SEPOLIA_RPC_URL, CHAIN_ID, alamat
 * kontrak). Proses API hanya membaca, jadi kunci operator tidak dibutuhkan. Dibuat sekali saat
 * pertama dipakai; null bila variabelnya belum diisi.
 */
function chainReader(): ReconciliationChainReader | null {
  const { SEPOLIA_RPC_URL, SEPOLIA_RPC_URL_FALLBACK, CHAIN_ID, KOS_TOKEN_ADDRESS, KOS_LEDGER_ADDRESS } = env;
  if (!SEPOLIA_RPC_URL || !KOS_TOKEN_ADDRESS || !KOS_LEDGER_ADDRESS) return null;

  const rpcUrls = SEPOLIA_RPC_URL_FALLBACK ? [SEPOLIA_RPC_URL, SEPOLIA_RPC_URL_FALLBACK] : [SEPOLIA_RPC_URL];
  const key = [...rpcUrls, CHAIN_ID, KOS_TOKEN_ADDRESS, KOS_LEDGER_ADDRESS].join('|');
  if (chainSetup?.key !== key) {
    const connection = createChainConnection(rpcUrls, CHAIN_ID);
    const contracts = new KosContracts(KOS_TOKEN_ADDRESS, KOS_LEDGER_ADDRESS, connection.provider);
    chainSetup = { key, reader: new KosContractsChainReader(contracts) };
  }
  return chainSetup.reader;
}

const cache = new ReportCache();

/** Laporan satu periode, dari cache bila masih baru. Menolak lebih dulu bila sumber belum dikonfigurasi. */
async function reportFor(query: unknown) {
  const { period: requested, only, refresh } = querySchema.parse(query);

  if (!midtrans.serverKey()) {
    throw new AppError(
      503,
      'MIDTRANS_NOT_CONFIGURED',
      'Status Midtrans belum bisa dicek karena MIDTRANS_SERVER_KEY belum diisi di backend.',
    );
  }
  const chain = chainReader();
  if (!chain) {
    throw new AppError(
      503,
      'CHAIN_NOT_CONFIGURED',
      'Catatan Sepolia belum bisa dibaca karena SEPOLIA_RPC_URL, KOS_TOKEN_ADDRESS, atau KOS_LEDGER_ADDRESS belum diisi di backend.',
    );
  }
  const period = requested ?? (await latestBillPeriod(prisma)) ?? currentWibPeriod(new Date());

  const report = await cache.get(
    period,
    () =>
      buildReport(period, {
        loadFacts: (target) => loadDatabaseFacts(prisma, target),
        midtrans,
        chain,
        chainId: env.CHAIN_ID,
      }),
    { refresh: refresh !== undefined },
  );
  return only === 'mismatch' ? onlyMismatches(report) : report;
}

const router = Router();

router.get('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const report = await reportFor(req.query);
  res.json({ data: report });
});

router.get('/summary', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { summary } = await reportFor(req.query);
  res.json({ data: summary });
});

export default router;
