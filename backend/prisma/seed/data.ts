// Data dummy Kos Sumbersari 01. Hanya berisi nilai, tanpa akses basis data, jadi mudah dibaca
// dan dicocokkan dengan proposal. Cara memasukkannya ke basis data ada di prisma/seed.ts.
//
// Semua nama dan email di sini fiktif (domain .test). Tidak ada nomor KTP, rekening, atau
// data pribadi asli. Nilai uang dalam rupiah bilangan bulat, ditulis sebagai bigint.
import type { BillStatus, KycStatus, Role, RoomStatus } from '../../src/generated/prisma/enums.js';

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

/**
 * Enam investor dummy selain Dimas, sesuai daftar admin KYC di Figma (frame 115-146 dan
 * 115-1084). Tidak punya kartu di halaman Masuk, tetapi bisa login.
 */
const OTHER_INVESTORS: SeedAccount[] = [
  { name: 'Rani Aulia', email: 'rani.dummy@kosbagi.test', role: 'INVESTOR' },
  { name: 'Fajar Nugroho', email: 'fajar.dummy@kosbagi.test', role: 'INVESTOR' },
  { name: 'Eko Saputra', email: 'eko.dummy@kosbagi.test', role: 'INVESTOR' },
  { name: 'Citra Lestari', email: 'citra.dummy@kosbagi.test', role: 'INVESTOR' },
  { name: 'Bagas Wicaksono', email: 'bagas.dummy@kosbagi.test', role: 'INVESTOR' },
  { name: 'Hendra Kusuma', email: 'hendra.dummy@kosbagi.test', role: 'INVESTOR' },
];

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
  ...OTHER_INVESTORS,
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
  // Tagihan November 2026 untuk 9 kamar terisi, semuanya belum dibayar. Sebelum demo, tim
  // membayar semuanya lewat Midtrans sandbox (npm run demo:bayar-sewa), sehingga setiap
  // pembayaran melewati webhook dan tercatat di KosLedger lewat recordRent. Sembilan kamar
  // lunas menghasilkan sewa kotor Rp13.500.000, angka kasus dasar perhitungan distribusi.
  ...SEED_ROOMS.filter((room) => room.tenantEmail !== null).map((room) => unpaid(room.number, CURRENT_PERIOD)),

  // Riwayat K03 untuk tabel riwayat di halaman penghuni. Tagihan paling awal juga menjadi
  // dasar masa sewa di API: 12 bulan mulai Agustus 2026, jadi sampai Juli 2027. Data lampau
  // ini tidak punya pembayaran Midtrans, jadi tidak pernah dicatat on-chain dan tampil tanpa
  // tautan Etherscan.
  paid('K03', '2026-08', '2026-08-06T10:21:00+07:00'),
  paid('K03', '2026-09', '2026-09-07T14:02:00+07:00'),
  paid('K03', '2026-10', '2026-10-08T09:48:00+07:00'),
];

export interface SeedKycSubmission {
  /** Email akun investor pengaju. */
  email: string;
  /** Nama yang diketik investor. Pemeriksaan otomatis membandingkannya dengan nama akun. */
  fullName: string;
  /** Nomor identitas dummy, selalu berawalan DUMMY-. Bukan nomor KTP. */
  dummyIdNumber: string;
  /** Hanya SUBMITTED atau REJECTED. Persetujuan dilakukan saat demo karena harus membuat dompet kustodian dan job whitelist. */
  status: Extract<KycStatus, 'SUBMITTED' | 'REJECTED'>;
  /** Waktu pengajuan (WIB), tampil di kolom Diajukan. */
  submittedAt: Date;
  /** Diisi untuk pengajuan yang ditolak. Ditinjau oleh admin Laras Kusuma. */
  review: { reason: string; reviewedAt: Date } | null;
}

/**
 * Pengajuan KYC dummy. Nama, nomor, dan waktu mengikuti daftar admin di Figma; investor yang
 * di Figma sudah disetujui di sini masih SUBMITTED, supaya persetujuannya bisa didemokan.
 * Dimas Pratama sengaja tanpa pengajuan, sehingga demo dimulai dari mengajukan KYC.
 */
export const SEED_KYC_SUBMISSIONS: SeedKycSubmission[] = [
  submitted('rani.dummy@kosbagi.test', 'Rani Aulia', 'DUMMY-0051', '2026-11-03T11:02:00+07:00'),
  submitted('fajar.dummy@kosbagi.test', 'Fajar Nugroho', 'DUMMY-0034', '2026-11-02T16:05:00+07:00'),
  submitted('eko.dummy@kosbagi.test', 'Eko Saputra', 'DUMMY-0021', '2026-11-02T08:30:00+07:00'),
  submitted('citra.dummy@kosbagi.test', 'Citra Lestari', 'DUMMY-0013', '2026-11-01T13:45:00+07:00'),
  submitted('bagas.dummy@kosbagi.test', 'Bagas Wicaksono', 'DUMMY-0007', '2026-11-01T09:20:00+07:00'),
  {
    // Nama yang diketik berbeda satu huruf dari nama akun, jadi pemeriksaan otomatis
    // "nama sama dengan nama akun" gagal dan admin menolak. Investor boleh mengajukan lagi.
    email: 'hendra.dummy@kosbagi.test',
    fullName: 'Hendra Kusumah',
    dummyIdNumber: 'DUMMY-0028',
    status: 'REJECTED',
    submittedAt: new Date('2026-10-31T14:20:00+07:00'),
    review: {
      reason: 'Nama tidak sama dengan nama akun dummy. Gunakan Hendra Kusuma.',
      reviewedAt: new Date('2026-11-01T08:45:00+07:00'),
    },
  },
];

function submitted(email: string, fullName: string, dummyIdNumber: string, submittedAt: string): SeedKycSubmission {
  return { email, fullName, dummyIdNumber, status: 'SUBMITTED', submittedAt: new Date(submittedAt), review: null };
}

/**
 * Penawaran token KB-SMR01: 70% token (12.600) dijual ke investor, belum ada yang terjual.
 * Ditutup 31 Desember 2026 pukul 23.59 WIB; bila tidak habis, penawaran dibatalkan.
 */
export const SEED_OFFERING = {
  tokensOffered: SEED_PROPERTY.totalTokens - SEED_PROPERTY.ownerTokens,
  tokensSold: 0,
  status: 'OPEN',
  closesAt: new Date('2026-12-31T23:59:00+07:00'),
} as const;
