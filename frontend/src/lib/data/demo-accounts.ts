import type { AppRole } from "@/lib/types";

/**
 * Kata sandi semua akun demo, sama dengan konstanta di seed backend. Sengaja
 * tampil di antarmuka: akun ini hanya data dummy untuk prototipe.
 */
export const DEMO_PASSWORD = "demo-kosbagi";

/** Akun demo per peran. Semua nama dan email fiktif (domain .test). */
export interface DemoAccount {
  role: AppRole;
  roleLabel: string;
  name: string;
  initials: string;
  email: string;
  /** Teks di kartu peran halaman Masuk. */
  cardAccount: string;
  cardDescription: string;
  /** Keterangan di blok akun sidebar. */
  sidebarCaption: string;
  /** Halaman pertama setelah masuk. */
  homeHref: string;
}

export const demoAccounts: DemoAccount[] = [
  {
    role: "investor",
    roleLabel: "Investor",
    name: "Dimas Pratama",
    initials: "DP",
    email: "investor.dummy@kosbagi.test",
    cardAccount: "Dimas Pratama (dummy)",
    cardDescription: "Verifikasi KYC, beli token, dan pantau bagi hasil.",
    sidebarCaption: "Akun dummy · Investor",
    homeHref: "/investor",
  },
  {
    role: "penghuni",
    roleLabel: "Penghuni",
    name: "Sari Wulandari",
    initials: "SW",
    email: "penghuni.dummy@kosbagi.test",
    cardAccount: "Sari Wulandari, kamar K03 (dummy)",
    cardDescription: "Lihat tagihan dan bayar sewa lewat Midtrans.",
    sidebarCaption: "Akun dummy · Penghuni Kamar K03",
    homeHref: "/penghuni",
  },
  {
    role: "pengelola",
    roleLabel: "Pengelola",
    name: "Hadi Santoso",
    initials: "HS",
    email: "pengelola.dummy@kosbagi.test",
    cardAccount: "Hadi Santoso (dummy)",
    cardDescription: "Pantau status kamar dan catat biaya beserta nota.",
    sidebarCaption: "Akun dummy · Pengelola",
    homeHref: "/pengelola",
  },
  {
    role: "admin",
    roleLabel: "Admin",
    name: "Laras Kusuma",
    initials: "LK",
    email: "admin.dummy@kosbagi.test",
    cardAccount: "Laras Kusuma (dummy)",
    cardDescription: "Setujui KYC, tutup periode, dan cek rekonsiliasi.",
    sidebarCaption: "Akun dummy · Admin",
    homeHref: "/admin",
  },
];

export function getDemoAccount(role: AppRole): DemoAccount {
  const account = demoAccounts.find((item) => item.role === role);
  if (!account) throw new Error(`Akun demo untuk peran ${role} tidak ada.`);
  return account;
}

export function findDemoAccountByEmail(email: string): DemoAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return demoAccounts.find((item) => item.email === normalized);
}
