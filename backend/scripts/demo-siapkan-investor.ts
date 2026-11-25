// Menyiapkan saldo token investor demo lewat jalur sungguhan (keputusan pengguna 16 Nov 2026):
// Bagas 1.800, Citra 1.200, Eko 800, dan Fajar 560 token. Dimas membeli 100 token sendiri saat demo.
//
//   1. Admin menyetujui KYC keempat investor lewat API (POST /api/kyc/:id/approve), sehingga dompet
//      kustodian dan job WHITELIST_KYC dibuat seperti klik admin di layar.
//   2. Skrip menunggu worker jalur 3 mencatat dompet itu lolos KYC di KosToken.
//   3. Per investor, pesanan BUY- dibuat dengan pemeriksaan yang sama dengan
//      POST /api/offerings/:id/purchases (KYC, dompet, sisa penawaran, batas 10%, pesanan aktif),
//      tetapi dibayar lewat VA Core API supaya nomornya bisa dicetak di sini.
//   4. Kamu membayar VA di simulator sandbox. Skrip menunggu settlement di API status Midtrans lalu
//      mengirim notifikasi bertanda tangan ke webhook lokal; webhook memverifikasi signature, cek
//      ulang ke Midtrans, menandai lunas, dan menulis job TRANSFER_TOKENS untuk worker.
//
//   npm run demo:siapkan-investor [-- opsi]
//
//   --only bagas,eko             Hanya investor ini (bagas, citra, eko, fajar)
//   --bank bca                   Bank VA: bca (bawaan), bni, bri, permata
//   --max-tokens-per-order 1800  Pecah pesanan besar menjadi beberapa pesanan berurutan. Bila VA
//                                ditolak sandbox karena nominalnya, skrip memecah sendiri jadi dua
//   --max-attempts 5             Berapa kali VA baru dibuat per pesanan bila yang lama kedaluwarsa
//   --no-notify                  Tunggu notifikasi asli Midtrans lewat ngrok, jangan kirim sendiri
//   --url <alamat>               Server API, bawaan http://localhost:<PORT>
//   --password <sandi>           Kata sandi akun demo, bawaan demo-kosbagi
//   --wait-seconds 180           Batas tunggu worker mencatat dompet dan memindahkan token
//
// Aman dijalankan ulang: KYC yang sudah disetujui dan investor yang sudah memegang targetnya
// dilewati, dan VA aktif dari jalannya skrip sebelumnya dipakai lagi. order_id yang sudah dipakai di
// Midtrans dilewati otomatis. Butuh server API (npm run dev) dan worker (npm run worker).
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { env } from '../src/config/env.js';
import { AppError } from '../src/lib/errors.js';
import { prisma } from '../src/lib/prisma.js';
import {
  type BankTransferAttempt,
  continuePurchaseBankTransfer,
  openPurchaseBankTransfer,
} from '../src/modules/payments/bank-transfer.js';
import { midtrans, type VirtualAccountBank } from '../src/modules/payments/midtrans.js';
import { classifyTransaction } from '../src/modules/payments/status.js';
import { ADMIN_EMAIL, DEMO_PASSWORD, INVESTOR_TARGETS } from './demo/data.js';
import { type ApiClient, ApiError, ensureServer, login } from './lib/api-client.js';
import { sendSignedNotification } from './lib/notification.js';

const POLL_INTERVAL_MS = 3_000;
const EXPIRY_GRACE_MS = 30_000;
/** Nominal VA yang dianggap besar: di atas ini, kegagalan membuat VA memicu pemecahan pesanan. */
const LARGE_VA_IDR = 100_000_000;
const BANKS: readonly VirtualAccountBank[] = ['bca', 'bni', 'bri', 'permata'];
const SIMULATOR_URL: Record<VirtualAccountBank, string> = {
  bca: 'https://simulator.sandbox.midtrans.com/bca/va/index',
  bni: 'https://simulator.sandbox.midtrans.com/bni/va/index',
  bri: 'https://simulator.sandbox.midtrans.com/openapi/va/index',
  permata: 'https://simulator.sandbox.midtrans.com/openapi/va/index',
};

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const clock = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit' });

function fail(message: string): never {
  console.error(`Gagal: ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    only: { type: 'string' },
    bank: { type: 'string', default: 'bca' },
    'max-tokens-per-order': { type: 'string', default: '1800' },
    'max-attempts': { type: 'string', default: '5' },
    'no-notify': { type: 'boolean', default: false },
    url: { type: 'string', default: `http://localhost:${env.PORT}` },
    password: { type: 'string', default: DEMO_PASSWORD },
    'wait-seconds': { type: 'string', default: '180' },
  },
});

const bank = values.bank as VirtualAccountBank;
if (!BANKS.includes(bank)) fail(`bank harus salah satu dari ${BANKS.join(', ')}.`);
const maxPerOrder = Number(values['max-tokens-per-order']);
const maxAttempts = Number(values['max-attempts']);
const waitMs = Number(values['wait-seconds']) * 1_000;
if (![maxPerOrder, maxAttempts, waitMs].every((value) => Number.isInteger(value) && value > 0)) {
  fail('--max-tokens-per-order, --max-attempts, dan --wait-seconds harus bilangan bulat positif.');
}
const notify = !values['no-notify'];
const webhookUrl = new URL('/api/webhooks/midtrans', values.url).toString();
const only = values.only ? new Set(values.only.split(',').map((key) => key.trim().toLowerCase())) : null;
const targets = INVESTOR_TARGETS.filter((target) => !only || only.has(target.key));
if (targets.length === 0) fail(`--only harus memuat salah satu dari ${INVESTOR_TARGETS.map((target) => target.key).join(', ')}.`);

const serverKey = midtrans.serverKey();
if (!serverKey) fail('MIDTRANS_SERVER_KEY belum diisi di backend/.env.');
try {
  await ensureServer(values.url);
} catch (error) {
  fail((error as Error).message);
}

// Ctrl+C membatalkan sinyal ini. Perulangan di bawah memeriksa stop.signal.aborted, bukan variabel
// biasa, supaya jelas bahwa nilainya diubah dari luar perulangan (oleh penangan sinyal).
const stop = new AbortController();
process.once('SIGINT', () => {
  stop.abort();
  console.log('\nDihentikan. VA yang sudah dibuat tetap bisa dibayar sampai batas waktunya; jalankan ulang untuk melanjutkan.');
  void prisma.$disconnect().finally(() => process.exit(130));
});

// ---------------------------------------------------------------------------------------------
// 1. Persetujuan KYC lewat API admin
// ---------------------------------------------------------------------------------------------

interface KycRow {
  id: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  user: { id: string; name: string; email: string };
}

const admin = await login(values.url, ADMIN_EMAIL, values.password).catch((error: unknown) =>
  fail(`login admin gagal: ${(error as Error).message}`),
);
const { submissions } = await admin.get<{ submissions: KycRow[] }>('/api/kyc');

console.log('1. Persetujuan KYC');
for (const target of targets) {
  // Daftar admin urut terbaru lebih dulu: baris pertama adalah pengajuan terakhir investor ini.
  const latest = submissions.find((row) => row.user.email === target.email);
  if (!latest) fail(`${target.name} belum mengajukan KYC. Jalankan npm run db:seed lebih dulu.`);
  if (latest.status === 'APPROVED') {
    console.log(`   ${target.name}: sudah disetujui.`);
  } else if (latest.status === 'SUBMITTED') {
    await admin.post(`/api/kyc/${latest.id}/approve`);
    console.log(`   ${target.name}: disetujui, dompet kustodian dibuat.`);
  } else {
    fail(`pengajuan KYC ${target.name} terakhir ditolak. Ajukan lagi lewat halaman investor, lalu ulangi.`);
  }
}

// ---------------------------------------------------------------------------------------------
// 2. Menunggu dompet tercatat lolos KYC di KosToken
// ---------------------------------------------------------------------------------------------

interface CurrentOffering {
  offering: { id: string; tokensRemaining: number; pricePerTokenIdr: number; status: string };
  investor: { walletReady: boolean; walletAddress: string | null; holdingTokens: number; reservedTokens: number; remainingQuota: number };
  activePurchase: { id: string; tokenAmount: number } | null;
}

const investors = new Map<string, ApiClient & { userId: string; name: string }>();
for (const target of targets) {
  investors.set(target.key, await login(values.url, target.email, values.password));
}

async function current(key: string): Promise<CurrentOffering> {
  return (investors.get(key) as ApiClient).get<CurrentOffering>('/api/offerings/current');
}

console.log('2. Menunggu worker mencatat dompet di KosToken (setKycStatus)');
const walletDeadline = Date.now() + waitMs;
for (const target of targets) {
  for (;;) {
    const state = await current(target.key);
    if (state.investor.walletReady) {
      console.log(`   ${target.name}: dompet ${state.investor.walletAddress} tercatat.`);
      break;
    }
    if (Date.now() > walletDeadline) {
      fail(`dompet ${target.name} belum tercatat setelah ${waitMs / 1_000} detik. Pastikan worker jalan (npm run worker) dan lihat antrean di /admin.`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

// ---------------------------------------------------------------------------------------------
// 3. Pesanan BUY- dengan VA sandbox
// ---------------------------------------------------------------------------------------------

type WaitResult = 'PAID' | 'EXPIRED' | 'FAILED';

async function deliver(orderId: string, status: Parameters<typeof sendSignedNotification>[2]): Promise<string> {
  if (!notify || !serverKey) return 'menunggu notifikasi Midtrans';
  const response = await sendSignedNotification(webhookUrl, orderId, status, serverKey);
  try {
    const outcome = (JSON.parse(response.body) as { data?: { outcome?: string } }).data?.outcome;
    return `HTTP ${response.status}${outcome ? ` ${outcome}` : ''}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

async function waitUntilPaid(purchaseId: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const purchase = await prisma.tokenPurchase.findUniqueOrThrow({ where: { id: purchaseId }, select: { status: true } });
    if (purchase.status === 'PAID') return true;
    await sleep(1_000);
  }
  return false;
}

async function waitForPayment(purchaseId: string, attempt: Extract<BankTransferAttempt, { kind: 'ready' }>): Promise<WaitResult> {
  const { orderId, expiresAt } = attempt.payment;
  for (;;) {
    await sleep(POLL_INTERVAL_MS);
    const status = await midtrans.getTransactionStatus(orderId).catch(() => null);
    const verdict = status ? classifyTransaction(status) : 'WAITING';
    if (status && verdict === 'PAID') {
      console.log(`      Terbayar di Midtrans. Notifikasi: ${await deliver(orderId, status)}`);
      return (await waitUntilPaid(purchaseId, notify ? 5_000 : 60_000)) ? 'PAID' : 'FAILED';
    }
    if (status && (verdict === 'EXPIRED' || verdict === 'FAILED')) {
      console.log(`      Midtrans melaporkan ${status.transaction_status}. Notifikasi: ${await deliver(orderId, status)}`);
      return verdict;
    }
    if (Date.now() > expiresAt.getTime() + EXPIRY_GRACE_MS) return 'EXPIRED';
  }
}

function printVa(name: string, attempt: Extract<BankTransferAttempt, { kind: 'ready' }>, tokens: number): void {
  for (const skipped of attempt.skippedOrderIds) console.log(`      ${skipped} sudah dipakai di Midtrans sebelumnya, dilewati.`);
  console.log(`   ${name}  ${attempt.payment.orderId}  ${tokens} token  ${rupiah.format(Number(attempt.payment.amountIdr))}`);
  console.log(`      Nomor VA ${bank.toUpperCase()}: ${attempt.vaNumber}${attempt.created ? '' : '  (VA aktif dari percobaan sebelumnya)'}`);
  console.log(`      Bayar di ${SIMULATOR_URL[bank]} sebelum ${clock.format(attempt.payment.expiresAt)} WIB`);
  console.log('      Menunggu pembayaran...');
}

/** Membayar satu pesanan sampai lunas, membuat VA baru bila yang lama kedaluwarsa. */
async function payPurchase(name: string, userId: string, purchaseId: string, first: BankTransferAttempt, tokens: number): Promise<boolean> {
  let attempt = first;
  for (let round = 1; round <= maxAttempts && !stop.signal.aborted; round += 1) {
    if (attempt.kind === 'already-paid') return true;
    if (attempt.kind === 'busy') {
      console.log(`   ${name}: pesanan ${attempt.payment.orderId} sedang dibayar lewat Snap sampai ${clock.format(attempt.payment.expiresAt)} WIB, dilewati.`);
      return false;
    }
    printVa(name, attempt, tokens);
    const outcome = await waitForPayment(purchaseId, attempt);
    if (outcome === 'PAID') return true;
    console.log(`      VA ${outcome === 'EXPIRED' ? 'kedaluwarsa' : 'gagal'}${round < maxAttempts ? ', membuat VA baru.' : '.'}`);
    if (round < maxAttempts) attempt = await continuePurchaseBankTransfer(purchaseId, userId, bank);
  }
  return false;
}

/** Membuat pesanan baru dengan VA. Bila VA besar ditolak, nominal dipecah dua dan dicoba lagi. */
async function openOrder(offeringId: string, userId: string, tokens: number, price: number) {
  let amount = tokens;
  for (;;) {
    try {
      return { tokens: amount, ...(await openPurchaseBankTransfer(offeringId, userId, amount, bank)) };
    } catch (error) {
      const large = amount * price > LARGE_VA_IDR && amount > 1;
      if (!(error instanceof AppError) || error.code !== 'MIDTRANS_UNAVAILABLE' || !large) throw error;
      amount = Math.ceil(amount / 2);
      console.log(`      VA ${rupiah.format(tokens * price)} gagal dibuat; pesanan dipecah menjadi ${amount} token per pesanan.`);
    }
  }
}

console.log(`3. Pesanan token (simulator VA ${bank.toUpperCase()}: ${SIMULATOR_URL[bank]})`);
console.log('   Di simulator: tempel nomor VA, tekan Inquire, lalu Pay. Tekan Ctrl+C untuk berhenti.');
const results: Array<{ name: string; result: string }> = [];

for (const target of targets) {
  if (stop.signal.aborted) break;
  const client = investors.get(target.key) as ApiClient & { userId: string };
  let done = false;
  try {
    for (let guard = 0; guard < 20 && !stop.signal.aborted; guard += 1) {
      const state = await current(target.key);
      const holding = state.investor.holdingTokens;
      if (holding >= target.tokens) {
        done = true;
        break;
      }

      // Pesanan aktif dari jalannya skrip sebelumnya: lanjutkan pembayarannya.
      if (state.activePurchase) {
        const attempt = await continuePurchaseBankTransfer(state.activePurchase.id, client.userId, bank);
        if (!(await payPurchase(target.name, client.userId, state.activePurchase.id, attempt, state.activePurchase.tokenAmount))) break;
        continue;
      }

      const missing = Math.min(target.tokens - holding, maxPerOrder);
      const order = await openOrder(state.offering.id, client.userId, missing, state.offering.pricePerTokenIdr);
      if (!(await payPurchase(target.name, client.userId, order.purchaseId, order.attempt, order.tokens))) break;
    }
  } catch (error) {
    const message = error instanceof AppError || error instanceof ApiError ? `${error.code} ${error.message}` : String(error);
    console.log(`   ${target.name}: gagal, ${message}`);
  }
  const holding = (await current(target.key)).investor.holdingTokens;
  results.push({ name: target.name, result: done || holding >= target.tokens ? `${holding} token lunas` : `baru ${holding} dari ${target.tokens} token` });
}

// ---------------------------------------------------------------------------------------------
// 4. Menunggu worker memindahkan token (transferFromTreasury)
// ---------------------------------------------------------------------------------------------

interface PurchaseRow {
  orderNumber: string | null;
  status: string;
  transfer: { status: 'PENDING' | 'RECORDED'; txHash: string | null } | null;
}

console.log('4. Menunggu worker memindahkan token ke dompet kustodian (transferFromTreasury)');
const transferDeadline = Date.now() + waitMs;
let pending = 0;
for (;;) {
  pending = 0;
  for (const target of targets) {
    const { purchases } = await (investors.get(target.key) as ApiClient).get<{ purchases: PurchaseRow[] }>('/api/purchases');
    pending += purchases.filter((purchase) => purchase.status === 'PAID' && purchase.transfer?.status !== 'RECORDED').length;
  }
  if (pending === 0 || Date.now() > transferDeadline || stop.signal.aborted) break;
  await sleep(POLL_INTERVAL_MS);
}

console.log('\nRingkasan:');
for (const { name, result } of results) console.log(`   ${name.padEnd(16)} ${result}`);
console.log(
  pending === 0
    ? '   Semua token sudah pindah on-chain.'
    : `   ${pending} pemindahan token masih menunggu worker. Periksa antrean job di /admin sebelum menutup periode.`,
);
await prisma.$disconnect();
if (results.some(({ result }) => !result.endsWith('lunas')) || pending > 0) process.exitCode = 1;
