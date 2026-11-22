// Menyusun laporan rekonsiliasi satu periode: fakta database dibaca sekali, lalu Midtrans dan
// Sepolia dicek bersamaan (masing-masing dengan batas konkurensi), lalu setiap order dibandingkan
// dengan aturan di compare.ts.
//
// Laporan disimpan sebentar (ReportCache) karena halaman rekonsiliasi dan kartu Perlu perhatian
// di ringkasan admin sama-sama memintanya, dan setiap laporan memanggil API status Midtrans sekali
// per order. Tombol Periksa ulang melewati cache.
import { compareSources } from './compare.js';
import { type CheckBudget, checkChain, checkMidtrans, type MidtransStatusReader, type ReconciliationChainReader } from './sources.js';
import type { DatabaseFact, ReconciliationReport, ReconciliationRowDto, ReconciliationSummaryDto } from './types.js';

/** Panggilan bersamaan per sumber. API status Midtrans sandbox cukup cepat, sekitar 0,3 sampai 1 detik. */
export const DEFAULT_CONCURRENCY = 5;
/** Batas tunggu satu panggilan, di bawah batas tunggu client Midtrans (8 detik). */
export const DEFAULT_PER_CALL_TIMEOUT_MS = 4_000;
/** Seluruh pemeriksaan harus selesai jauh sebelum proxy frontend memutus permintaan (15 detik). */
export const DEFAULT_TOTAL_BUDGET_MS = 10_000;
/** Umur laporan di cache. */
export const REPORT_CACHE_TTL_MS = 30_000;

export interface ReconciliationDeps {
  loadFacts(period: string): Promise<DatabaseFact[]>;
  midtrans: MidtransStatusReader;
  chain: ReconciliationChainReader;
  /** Chain ID jaringan yang dibaca, untuk tautan Etherscan. */
  chainId: number;
  now?: () => Date;
  concurrency?: number;
  perCallTimeoutMs?: number;
  totalBudgetMs?: number;
}

export function summarize(rows: readonly ReconciliationRowDto[], checkedAt: Date): ReconciliationSummaryDto {
  const matched = rows.filter((row) => row.result === 'MATCH').length;
  return { total: rows.length, matched, mismatched: rows.length - matched, checkedAt };
}

/** Laporan lengkap satu periode, semua baris. */
export async function buildReport(period: string, deps: ReconciliationDeps): Promise<ReconciliationReport> {
  const now = deps.now ?? (() => new Date());
  const started = now().getTime();
  const budget: CheckBudget = {
    concurrency: deps.concurrency ?? DEFAULT_CONCURRENCY,
    perCallTimeoutMs: deps.perCallTimeoutMs ?? DEFAULT_PER_CALL_TIMEOUT_MS,
    deadline: started + (deps.totalBudgetMs ?? DEFAULT_TOTAL_BUDGET_MS),
  };
  const clock = () => now().getTime();

  const facts = await deps.loadFacts(period);
  const [midtransFacts, chainFacts] = await Promise.all([
    checkMidtrans(
      facts.map((fact) => fact.orderId),
      deps.midtrans,
      budget,
      clock,
    ),
    checkChain(facts, deps.chain, budget, clock),
  ]);

  const rows = facts.map((fact) =>
    compareSources(fact, midtransFacts.get(fact.orderId)!, chainFacts.get(fact.orderId)!, { chainId: deps.chainId }),
  );
  return { period, summary: summarize(rows, now()), rows };
}

/** Hanya baris Selisih; ringkasan tetap menghitung semua baris. */
export function onlyMismatches(report: ReconciliationReport): ReconciliationReport {
  return { ...report, rows: report.rows.filter((row) => row.result === 'MISMATCH') };
}

interface CacheEntry {
  createdAt: number;
  report: Promise<ReconciliationReport>;
}

/**
 * Cache laporan per periode. Permintaan yang datang selagi laporan yang sama sedang disusun ikut
 * menunggu hasil yang sama, jadi Midtrans tidak ditanya dua kali. Laporan yang gagal tidak disimpan.
 */
export class ReportCache {
  private readonly entries = new Map<string, CacheEntry>();

  constructor(
    private readonly ttlMs: number = REPORT_CACHE_TTL_MS,
    private readonly now: () => number = Date.now,
  ) {}

  get(period: string, build: () => Promise<ReconciliationReport>, { refresh = false } = {}): Promise<ReconciliationReport> {
    const existing = this.entries.get(period);
    if (existing && !refresh && this.now() - existing.createdAt < this.ttlMs) return existing.report;

    const report = build();
    const entry: CacheEntry = { createdAt: this.now(), report };
    this.entries.set(period, entry);
    report.catch(() => {
      if (this.entries.get(period) === entry) this.entries.delete(period);
    });
    return report;
  }

  clear(): void {
    this.entries.clear();
  }
}
