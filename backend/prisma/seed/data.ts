// Data dummy Kos Sumbersari 01. Hanya berisi nilai, tanpa akses basis data, jadi mudah dibaca
// dan dicocokkan dengan proposal. Cara memasukkannya ke basis data ada di prisma/seed.ts.
//
// Semua nama dan email di sini fiktif (domain .test). Tidak ada nomor KTP, rekening, atau
// data pribadi asli. Nilai uang dalam rupiah bilangan bulat, ditulis sebagai bigint.
import type { BillStatus, Role, RoomStatus } from '../../src/generated/prisma/enums.js';

/** Kata sandi semua akun demo. Sengaja ditulis terbuka karena hanya untuk data dummy lokal. */
export const DEMO_PASSWORD = 'demo-kosbagi';

export interface SeedAccount {
  name: string;
  email: string;
  role: Role;
}

/** Empat akun demo, harus sama dengan frontend/src/lib/data/demo-accounts.ts. */
export const INVESTOR_ACCOUNT: SeedAccount = {
  name: 'Dimas Pratama',
  email: 'investor.dummy@kosbagi.test',
  role: 'INVESTOR',
};
export const TENANT_ACCOUNT: SeedAccount = {
  name: 'Sari Wulandari',
  email: 'penghuni.dummy@kosbagi.test',
  role: 'TENANT',
};
export const MANAGER_ACCOUNT: SeedAccount = {
  name: 'Hadi Santoso',
  email: 'pengelola.dummy@kosbagi.test',
  role: 'MANAGER',
};
export const ADMIN_ACCOUNT: SeedAccount = {
  name: 'Laras Kusuma',
  email: 'admin.dummy@kosbagi.test',
  role: 'ADMIN',
};

/** Penghuni kamar selain K03. Tidak punya kartu di halaman Masuk, tetapi bisa login. */
const OTHER_TENANTS: Array<{ room: string; name: string }> = [
  { room: 'K01', name: 'Bagus Nugroho' },
  { room: 'K02', name: 'Citra Maharani' },
  { room: 'K04', name: 'Eko Wicaksono' },
  { room: 'K05', name: 'Fitri Handayani' },
  { room: 'K07', name: 'Galih Prasetyo' },
  { room: 'K08', name: 'Intan Permatasari' },
  { room: 'K09', name: 'Joko Susilo' },
  { room: 'K10', name: 'Kartika Dewi' },
];

function otherTenantEmail(room: string): string {
  return `penghuni.${room.toLowerCase()}.dummy@kosbagi.test`;
}

export const SEED_ACCOUNTS: SeedAccount[] = [
  INVESTOR_ACCOUNT,
  TENANT_ACCOUNT,
  MANAGER_ACCOUNT,
  ADMIN_ACCOUNT,
  ...OTHER_TENANTS.map(({ room, name }): SeedAccount => ({ name, email: otherTenantEmail(room), role: 'TENANT' })),
];

/** Properti studi kasus. 18.000 token = Rp1.800.000.000 ÷ Rp100.000 (proposal bagian 2.2). */
export const SEED_PROPERTY = {
  code: 'SMR01',
  slug: 'sumbersari-01',
  name: 'Kos Sumbersari 01',
  address: 'Jl. Sumbersari, Malang (dummy)',
  valuationIdr: 1_800_000_000n,
  tokenSymbol: 'KB-SMR01',
  totalTokens: 18_000,
  tokenPriceIdr: 100_000n,
  ownerTokens: 5_400,
  maxTokensPerInvestor: 1_800,
};

export const MONTHLY_RENT_IDR = 1_500_000n;

export interface SeedRoom {
  number: string;
  status: RoomStatus;
  /** Email penghuni, atau null untuk kamar kosong. */
  tenantEmail: string | null;
}

/** Sepuluh kamar. K06 kosong, sehingga okupansi 90% sesuai asumsi proposal. */
export const SEED_ROOMS: SeedRoom[] = [
  { number: 'K01', status: 'OCCUPIED', tenantEmail: otherTenantEmail('K01') },
  { number: 'K02', status: 'OCCUPIED', tenantEmail: otherTenantEmail('K02') },
  { number: 'K03', status: 'OCCUPIED', tenantEmail: TENANT_ACCOUNT.email },
  { number: 'K04', status: 'OCCUPIED', tenantEmail: otherTenantEmail('K04') },
  { number: 'K05', status: 'OCCUPIED', tenantEmail: otherTenantEmail('K05') },
  { number: 'K06', status: 'VACANT', tenantEmail: null },
  { number: 'K07', status: 'OCCUPIED', tenantEmail: otherTenantEmail('K07') },
  { number: 'K08', status: 'OCCUPIED', tenantEmail: otherTenantEmail('K08') },
  { number: 'K09', status: 'OCCUPIED', tenantEmail: otherTenantEmail('K09') },
  { number: 'K10', status: 'OCCUPIED', tenantEmail: otherTenantEmail('K10') },
];

export interface SeedBill {
  room: string;
  period: string;
  amountIdr: bigint;
  status: BillStatus;
  dueDate: Date;
  paidAt: Date | null;
}

/** Jatuh tempo tanggal 10. Kolomnya bertipe DATE, jadi ditulis tengah malam UTC supaya tanggalnya tidak bergeser. */
function dueDate(period: string): Date {
  return new Date(`${period}-10T00:00:00.000Z`);
}

function unpaid(room: string, period: string): SeedBill {
  return { room, period, amountIdr: MONTHLY_RENT_IDR, status: 'UNPAID', dueDate: dueDate(period), paidAt: null };
}

/** `paidAt` ditulis dengan zona WIB. */
function paid(room: string, period: string, paidAt: string): SeedBill {
  return {
    room,
    period,
    amountIdr: MONTHLY_RENT_IDR,
    status: 'PAID',
    dueDate: dueDate(period),
    paidAt: new Date(paidAt),
  };
}

/** Periode berjalan saat demo. */
export const CURRENT_PERIOD = '2026-11';

export const SEED_BILLS: SeedBill[] = [
  // Tagihan November 2026 untuk 9 kamar terisi. K03, K04, K07 sengaja belum dibayar untuk demo.
  paid('K01', CURRENT_PERIOD, '2026-11-01T09:12:00+07:00'),
  paid('K02', CURRENT_PERIOD, '2026-11-02T13:40:00+07:00'),
  unpaid('K03', CURRENT_PERIOD),
  unpaid('K04', CURRENT_PERIOD),
  paid('K05', CURRENT_PERIOD, '2026-11-01T19:05:00+07:00'),
  unpaid('K07', CURRENT_PERIOD),
  paid('K08', CURRENT_PERIOD, '2026-11-03T08:27:00+07:00'),
  paid('K09', CURRENT_PERIOD, '2026-11-04T16:51:00+07:00'),
  paid('K10', CURRENT_PERIOD, '2026-11-05T11:33:00+07:00'),

  // Riwayat K03 untuk tabel riwayat di halaman penghuni. Tagihan paling awal juga menjadi
  // dasar masa sewa di API: 12 bulan mulai Agustus 2026, jadi sampai Juli 2027.
  paid('K03', '2026-08', '2026-08-06T10:21:00+07:00'),
  paid('K03', '2026-09', '2026-09-07T14:02:00+07:00'),
  paid('K03', '2026-10', '2026-10-08T09:48:00+07:00'),
];
