// Membayar semua tagihan sewa UNPAID satu periode lewat Midtrans sandbox, untuk menyiapkan data
// demo. Setiap pembayaran tetap melewati jalur biasa: webhook memverifikasi signature, mengecek
// ulang status ke Midtrans, menandai lunas, dan menulis outbox RECORD_RENT untuk worker.
//
//   npm run demo:bayar-sewa -- --period 2026-11 [opsi]
//
//   --rooms K01,K02     Hanya kamar ini
//   --except K03        Lewati kamar ini, mis. untuk demo bayar langsung oleh penghuni
//   --bank bca          Bank virtual account: bca (bawaan), bni, bri, permata
//   --no-notify         Jangan kirim notifikasi sendiri; tunggu notifikasi asli Midtrans lewat ngrok
//   --url <alamat>      Bawaan http://localhost:<PORT>/api/webhooks/midtrans
//   --max-attempts 5    Berapa kali VA baru dibuat per kamar bila yang lama kedaluwarsa atau gagal.
//                       order_id yang sudah dipakai di Midtrans dilewati otomatis dan tidak dihitung
//
// Sandbox Midtrans tidak menyediakan API resmi untuk membayar VA, jadi satu langkah tetap manual:
// skrip mencetak nomor VA per kamar, lalu kamu membayarnya di simulator sandbox. Kamar diproses
// satu per satu, masing-masing dengan batas bayar 5 menit. Butuh server API yang sedang jalan
// (npm run dev). Worker (npm run worker) boleh jalan bersamaan supaya recordRent langsung terkirim.
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { env } from '../src/config/env.js';
import { AppError } from '../src/lib/errors.js';
import { prisma } from '../src/lib/prisma.js';
import { type BankTransferAttempt, openBankTransferAttempt } from '../src/modules/payments/bank-transfer.js';
import { midtrans, type TransactionStatus, type VirtualAccountBank } from '../src/modules/payments/midtrans.js';
import { classifyTransaction } from '../src/modules/payments/status.js';
import { sendSignedNotification } from './lib/notification.js';

const POLL_INTERVAL_MS = 3_000;
/** Jeda setelah batas bayar sebelum VA dianggap kedaluwarsa walau Midtrans belum melaporkannya. */
const EXPIRY_GRACE_MS = 30_000;
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

function roomList(value: string | undefined): Set<string> | null {
  if (!value) return null;
  return new Set(value.split(',').map((room) => room.trim().toUpperCase()).filter(Boolean));
}

const { values } = parseArgs({
  options: {
    period: { type: 'string' },
    rooms: { type: 'string' },
    except: { type: 'string' },
    bank: { type: 'string', default: 'bca' },
    'no-notify': { type: 'boolean', default: false },
    url: { type: 'string', default: `http://localhost:${env.PORT}/api/webhooks/midtrans` },
    'max-attempts': { type: 'string', default: '5' },
  },
});

const period = values.period;
if (!period || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
  fail('sebutkan periode berformat YYYY-MM, mis. npm run demo:bayar-sewa -- --period 2026-11');
}
const bank = values.bank as VirtualAccountBank;
if (!BANKS.includes(bank)) fail(`bank harus salah satu dari ${BANKS.join(', ')}.`);
const maxAttempts = Number(values['max-attempts']);
if (!Number.isInteger(maxAttempts) || maxAttempts < 1) fail('--max-attempts harus bilangan bulat minimal 1.');
const notify = !values['no-notify'];
const webhookUrl = values.url;
const onlyRooms = roomList(values.rooms);
const exceptRooms = roomList(values.except) ?? new Set<string>();

const serverKey = midtrans.serverKey();
if (!serverKey) fail('MIDTRANS_SERVER_KEY belum diisi di backend/.env.');

// Webhook dikirim ke server yang sedang jalan, jadi pastikan server bisa dihubungi lebih dulu.
const healthUrl = new URL('/api/health', webhookUrl).toString();
try {
  const health = await fetch(healthUrl);
  if (!health.ok) throw new Error(`HTTP ${health.status}`);
} catch {
  fail(`server API tidak bisa dihubungi di ${healthUrl}. Jalankan npm run dev di terminal lain, lalu ulangi.`);
}

type RoomResult = { room: string; orderId: string | null; result: string };
const results: RoomResult[] = [];

async function deliver(orderId: string, status: TransactionStatus): Promise<string> {
  if (!notify || !serverKey) return 'menunggu notifikasi Midtrans';
  const response = await sendSignedNotification(webhookUrl, orderId, status, serverKey);
  try {
    const outcome = (JSON.parse(response.body) as { data?: { outcome?: string } }).data?.outcome;
    return `HTTP ${response.status}${outcome ? ` ${outcome}` : ''}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

/** Menunggu tagihan lunas di basis data, paling lama `timeoutMs`. */
async function waitUntilPaid(billId: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const bill = await prisma.bill.findUniqueOrThrow({ where: { id: billId }, select: { status: true } });
    if (bill.status === 'PAID') return true;
    await sleep(1_000);
  }
  return false;
}

type WaitResult = 'PAID' | 'EXPIRED' | 'FAILED';

/** Menunggu VA dibayar di simulator, kedaluwarsa, atau dibatalkan. */
async function waitForPayment(billId: string, attempt: Extract<BankTransferAttempt, { kind: 'ready' }>): Promise<WaitResult> {
  const { orderId, expiresAt } = attempt.payment;
  for (;;) {
    await sleep(POLL_INTERVAL_MS);
    const status = await midtrans.getTransactionStatus(orderId).catch(() => null);
    const verdict = status ? classifyTransaction(status) : 'WAITING';

    if (status && verdict === 'PAID') {
      console.log(`    Terbayar di Midtrans. Notifikasi: ${await deliver(orderId, status)}`);
      // Tanpa --no-notify, webhook sudah selesai saat notifikasi dibalas. Dengan --no-notify,
      // tunggu notifikasi asli dari Midtrans sampai 60 detik.
      return (await waitUntilPaid(billId, notify ? 5_000 : 60_000)) ? 'PAID' : 'FAILED';
    }
    if (status && (verdict === 'EXPIRED' || verdict === 'FAILED')) {
      console.log(`    Midtrans melaporkan ${status.transaction_status}. Notifikasi: ${await deliver(orderId, status)}`);
      return verdict;
    }
    if (Date.now() > expiresAt.getTime() + EXPIRY_GRACE_MS) return 'EXPIRED';
  }
}

async function payBill(bill: { id: string; room: { number: string } }): Promise<RoomResult> {
  const room = bill.room.number;
  for (let round = 1; round <= maxAttempts; round += 1) {
    let attempt: BankTransferAttempt;
    try {
      attempt = await openBankTransferAttempt(bill.id, bank);
    } catch (error) {
      if (!(error instanceof AppError) || error.code !== 'MIDTRANS_UNAVAILABLE') throw error;
      // Mis. order_id ini sudah pernah dipakai di akun sandbox sebelum basis data diisi ulang.
      // Percobaan itu tercatat FAILED, jadi putaran berikutnya memakai sufiks baru.
      console.log(`  ${room}: VA gagal dibuat di Midtrans${round < maxAttempts ? ', mencoba order_id berikutnya.' : '.'}`);
      continue;
    }
    if (attempt.kind === 'already-paid') return { room, orderId: null, result: 'sudah lunas' };
    if (attempt.kind === 'busy') {
      const until = clock.format(attempt.payment.expiresAt);
      console.log(`  ${room}: dilewati, penghuni sedang membayar lewat Snap (${attempt.payment.orderId}) sampai ${until} WIB.`);
      return { room, orderId: attempt.payment.orderId, result: 'dilewati' };
    }

    const { orderId, expiresAt } = attempt.payment;
    for (const skipped of attempt.skippedOrderIds) {
      console.log(`  ${room}: ${skipped} sudah dipakai di Midtrans sebelumnya, dilewati.`);
    }
    console.log('');
    console.log(`  ${room}  ${orderId}  ${rupiah.format(Number(attempt.payment.amountIdr))}`);
    console.log(`    Nomor VA ${bank.toUpperCase()}: ${attempt.vaNumber}${attempt.created ? '' : '  (VA aktif dari percobaan sebelumnya)'}`);
    console.log(`    Bayar di ${SIMULATOR_URL[bank]} sebelum ${clock.format(expiresAt)} WIB`);
    console.log('    Menunggu pembayaran...');

    const outcome = await waitForPayment(bill.id, attempt);
    if (outcome === 'PAID') {
      console.log(`    ${room} lunas.`);
      return { room, orderId, result: 'lunas' };
    }
    console.log(`    VA ${outcome === 'EXPIRED' ? 'kedaluwarsa' : 'gagal'}${round < maxAttempts ? ', membuat VA baru.' : '.'}`);
  }
  return { room, orderId: null, result: `belum lunas setelah ${maxAttempts} VA` };
}

let interrupted = false;
process.once('SIGINT', () => {
  interrupted = true;
  console.log('\nDihentikan. VA yang sudah dibuat tetap bisa dibayar sampai batas waktunya; jalankan ulang untuk melanjutkan.');
  void prisma.$disconnect().finally(() => process.exit(130));
});

const bills = (
  await prisma.bill.findMany({
    where: { period, status: 'UNPAID' },
    include: { room: { select: { number: true } } },
    orderBy: { room: { number: 'asc' } },
  })
).filter((bill) => (onlyRooms ? onlyRooms.has(bill.room.number) : true) && !exceptRooms.has(bill.room.number));

if (bills.length === 0) {
  console.log(`Tidak ada tagihan UNPAID untuk periode ${period} yang cocok dengan pilihan kamar.`);
  await prisma.$disconnect();
  process.exit(0);
}

console.log(`Membayar ${bills.length} tagihan periode ${period}: ${bills.map((bill) => bill.room.number).join(', ')}`);
console.log(`Simulator VA ${bank.toUpperCase()}: ${SIMULATOR_URL[bank]}`);
console.log(
  notify
    ? `Notifikasi dikirim ke ${webhookUrl} setelah Midtrans melaporkan pembayaran.`
    : 'Mode --no-notify: menunggu notifikasi asli Midtrans lewat ngrok.',
);
console.log('Di simulator: tempel nomor VA, tekan Inquire, lalu Pay. Tekan Ctrl+C untuk berhenti.');

for (const bill of bills) {
  if (interrupted) break;
  try {
    results.push(await payBill(bill));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  ${bill.room.number}: gagal, ${message}`);
    results.push({ room: bill.room.number, orderId: null, result: 'gagal' });
  }
}

console.log('\nRingkasan:');
for (const { room, orderId, result } of results) console.log(`  ${room}  ${(orderId ?? '-').padEnd(28)}  ${result}`);
await prisma.$disconnect();
if (results.some(({ result }) => result !== 'lunas' && result !== 'sudah lunas')) process.exitCode = 1;
