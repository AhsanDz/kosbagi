import type {
  InvestorCurrentPeriodDto,
  PeriodStatus,
  PortfolioSummaryPayload,
  RentFeedItemDto,
  RentFeedStatus,
} from "@/lib/api/types";
import { kosSumbersari01 } from "@/lib/data/properties";
import { formatPercent } from "@/lib/format";
import { dayOfPeriod, daysInPeriod, periodOf } from "@/lib/period";

/** Porsi kepemilikan dihitung dari saldo token, supaya tidak bergantung pada satuan percentOfSupply. */
export function holdingShare(tokenBalance: number): string {
  return formatPercent(tokenBalance / kosSumbersari01.totalTokens, 2);
}

/** Nilai beli pada harga penawaran Rp100.000 per token. */
export function holdingCostIdr(tokenBalance: number): number {
  return tokenBalance * kosSumbersari01.tokenPriceIdr;
}

/**
 * Status kamar di Daftar sewa masuk. FAILED tidak boleh sampai ke investor;
 * bila tetap datang, dibaca Menunggu pencatatan seperti aturan penghuni.
 */
export function feedStatus(item: RentFeedItemDto): RentFeedStatus {
  return item.status === "FAILED" ? "PENDING" : item.status;
}

/** Periode masih berjalan (belum tercatat ditutup di KosLedger). */
export function isRunningPeriod(status: PeriodStatus): boolean {
  return status === "OPEN" || status === "CLOSING" || status === "CLOSE_FAILED";
}

/** Ringkasan sedang menunggu sesuatu dari Sepolia, jadi layak dipantau ulang. */
export function summaryHasPending(payload: PortfolioSummaryPayload): boolean {
  const { currentPeriod } = payload;
  return (
    currentPeriod.status === "CLOSING" ||
    currentPeriod.rentFeed.some((item) => feedStatus(item) === "PENDING")
  );
}

/** Nilai sewa yang diharapkan periode ini: jumlah tagihan kamar terisi. */
export function expectedRentIdr(current: InvestorCurrentPeriodDto): number {
  const billed = current.rentFeed.filter((item) => feedStatus(item) !== "VACANT");
  if (billed.length >= current.roomsTotal && billed.length > 0) {
    return billed.reduce((sum, item) => sum + (item.amountIdr ?? 0), 0);
  }
  return current.roomsTotal * kosSumbersari01.monthlyRentIdr;
}

/** Satu anak tangga grafik: hari bayar dan jumlah sewa tercatat sampai hari itu. */
export interface RentStep {
  day: number;
  cumulativeIdr: number;
}

export interface RentChartModel {
  /** Jumlah hari dalam periode (sumbu X 1 sampai days). */
  days: number;
  /** Garis target di atas grafik: sewa yang diharapkan periode ini. */
  targetIdr: number;
  /** Nilai tertinggi sumbu Y. Sama dengan target kecuali sewa tercatat melebihinya. */
  maxIdr: number;
  steps: RentStep[];
  /** Hari ujung garis: hari ini selama periode berjalan, akhir bulan setelahnya. */
  endDay: number;
  /** Hari untuk garis putus-putus "Hari ini"; null bila periode sudah lewat atau ditutup. */
  todayDay: number | null;
}

/**
 * Grafik sewa tercatat (Figma: Kartu saldo bagi hasil). API mengirim jumlah
 * per tanggal bayar; grafik menjumlahkannya menjadi garis tangga kumulatif.
 */
export function buildRentChart(current: InvestorCurrentPeriodDto, now: Date): RentChartModel {
  const days = daysInPeriod(current.period);
  const perDay = new Map<number, number>();
  for (const point of current.chart) {
    if (periodOf(point.date) !== current.period) continue;
    const day = dayOfPeriod(point.date);
    perDay.set(day, (perDay.get(day) ?? 0) + point.amountIdr);
  }

  let running = 0;
  const steps = [...perDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, amount]) => {
      running += amount;
      return { day, cumulativeIdr: running };
    });

  const targetIdr = expectedRentIdr(current);
  const inPeriodToday = isRunningPeriod(current.status) && periodOf(now) === current.period;
  const todayDay = inPeriodToday ? dayOfPeriod(now) : null;
  const lastStepDay = steps.at(-1)?.day ?? 1;

  return {
    days,
    targetIdr,
    maxIdr: Math.max(targetIdr, running, 1),
    steps,
    endDay: todayDay !== null ? Math.max(todayDay, lastStepDay) : days,
    todayDay,
  };
}

/** Lebar kotak koordinat grafik di viewBox SVG (Figma: 592 x 180). */
export const CHART_WIDTH = 592;
export const CHART_HEIGHT = 180;

export function chartX(model: RentChartModel, day: number): number {
  return ((day - 1) / Math.max(model.days - 1, 1)) * CHART_WIDTH;
}

export function chartY(model: RentChartModel, amountIdr: number): number {
  return CHART_HEIGHT - (amountIdr / model.maxIdr) * CHART_HEIGHT;
}

/** Garis tangga: mendatar sampai hari bayar, lalu naik ke jumlah baru. */
export function chartPath(model: RentChartModel): string {
  const parts = [`M0 ${CHART_HEIGHT}`];
  let level = CHART_HEIGHT;
  for (const step of model.steps) {
    const x = chartX(model, step.day).toFixed(1);
    parts.push(`H${x}`);
    level = chartY(model, step.cumulativeIdr);
    parts.push(`V${level.toFixed(1)}`);
  }
  parts.push(`H${chartX(model, model.endDay).toFixed(1)}`);
  return parts.join(" ");
}

/** Hari yang diberi label di sumbu X: 1, 10, 20, dan hari terakhir. */
export function chartTicks(days: number): number[] {
  return [1, 10, 20, days];
}
