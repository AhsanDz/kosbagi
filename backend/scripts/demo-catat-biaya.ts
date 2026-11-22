// Mencatat biaya persiapan demo November (Rp2.400.000, keputusan pengguna 16 Nov 2026) lewat API
// pengelola sungguhan, dengan nota dummy dari scripts/demo/nota/. Setiap biaya melewati jalur
// biasa: validasi, hash SHA-256 dihitung server, baris biaya dan job RECORD_EXPENSE dalam satu
// transaksi, lalu worker jalur 3 memanggil KosLedger.recordExpense.
//
//   npm run demo:catat-biaya -- --period 2026-11 [opsi]
//
//   --url <alamat>       Server API, bawaan http://localhost:<PORT>
//   --email <email>      Akun pengelola, bawaan pengelola.dummy@kosbagi.test
//   --password <sandi>   Bawaan demo-kosbagi
//   --include-k07        Ikut mencatat nota perbaikan K07 (Rp300.000). Bawaannya tidak, karena nota
//                        itu diunggah pengelola lewat UI saat demo.
//
// Aman dijalankan ulang: nota yang hash-nya sudah tercatat dilewati (409 RECEIPT_ALREADY_RECORDED),
// jadi biaya tidak pernah ganda. Butuh server API yang sedang jalan (npm run dev).
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { env } from '../src/config/env.js';
import {
  DEMO_PASSWORD,
  type DemoExpense,
  MANAGER_EMAIL,
  NOVEMBER_DEMO_EXPENSE,
  NOVEMBER_PREPARED_EXPENSES,
  notaPath,
} from './demo/data.js';
import { ApiError, ensureServer, login } from './lib/api-client.js';

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

function fail(message: string): never {
  console.error(`Gagal: ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    period: { type: 'string' },
    url: { type: 'string', default: `http://localhost:${env.PORT}` },
    email: { type: 'string', default: MANAGER_EMAIL },
    password: { type: 'string', default: DEMO_PASSWORD },
    'include-k07': { type: 'boolean', default: false },
  },
});

const period = values.period;
if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
  fail('sebutkan periode berformat YYYY-MM, mis. npm run demo:catat-biaya -- --period 2026-11');
}

try {
  await ensureServer(values.url);
} catch (error) {
  fail((error as Error).message);
}

const manager = await login(values.url, values.email, values.password).catch((error: unknown) =>
  fail(`login pengelola ${values.email} gagal: ${(error as Error).message}`),
);

interface ExpenseList {
  closed: boolean;
  totals: { recordedIdr: number; pendingIdr: number; totalIdr: number; count: number };
  expenses: Array<{ receiptHash: string; description: string }>;
}

const before = await manager.get<ExpenseList>(`/api/expenses?period=${period}`);
if (before.closed) fail(`periode ${period} sudah ditutup; biaya tidak bisa ditambah.`);
const recorded = new Set(before.expenses.map((expense) => expense.receiptHash));

const expenses: DemoExpense[] = [...NOVEMBER_PREPARED_EXPENSES, ...(values['include-k07'] ? [NOVEMBER_DEMO_EXPENSE] : [])];
console.log(`Mencatat ${expenses.length} biaya periode ${period} sebagai ${manager.name}.`);

let created = 0;
for (const expense of expenses) {
  const content = await readFile(notaPath(expense.file));
  const hash = `0x${createHash('sha256').update(content).digest('hex')}`;
  const label = `${expense.receiptDate}  ${expense.description.padEnd(30)} ${rupiah.format(expense.amountIdr).padStart(13)}`;
  if (recorded.has(hash)) {
    console.log(`  ${label}  sudah tercatat (${hash.slice(0, 10)}...)`);
    continue;
  }

  const form = new FormData();
  form.set('period', period);
  form.set('categoryCode', String(expense.categoryCode));
  form.set('description', expense.description);
  form.set('amountIdr', String(expense.amountIdr));
  form.set('receiptDate', expense.receiptDate);
  form.set('file', new Blob([content], { type: 'application/pdf' }), expense.file);

  try {
    const result = await manager.upload<{ expense: { receiptHash: string } }>('/api/expenses', form);
    created += 1;
    console.log(`  ${label}  dicatat, hash ${result.expense.receiptHash.slice(0, 10)}...`);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'RECEIPT_ALREADY_RECORDED') {
      // Nota yang sama sudah dicatat di periode lain atau oleh proses lain.
      console.log(`  ${label}  dilewati: ${error.message}`);
      continue;
    }
    if (error instanceof ApiError) fail(`${expense.file}: ${error.status} ${error.code} ${error.message}`);
    throw error;
  }
}

const after = await manager.get<ExpenseList>(`/api/expenses?period=${period}`);
console.log(
  `\nSelesai: ${created} biaya baru. Total ${after.totals.count} nota ${rupiah.format(after.totals.totalIdr)}, ` +
    `tercatat on-chain ${rupiah.format(after.totals.recordedIdr)}, menunggu ${rupiah.format(after.totals.pendingIdr)}.`,
);
if (after.totals.pendingIdr > 0) {
  console.log('Nota yang menunggu dicatat worker jalur 3 (npm run worker) lewat KosLedger.recordExpense.');
}
if (!values['include-k07']) {
  console.log(`Nota ${NOVEMBER_DEMO_EXPENSE.file} (${rupiah.format(NOVEMBER_DEMO_EXPENSE.amountIdr)}) disimpan untuk diunggah pengelola saat demo.`);
}
