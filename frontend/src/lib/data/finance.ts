/**
 * Angka keuangan statis dari asumsi proposal (angka dummy, bukan jaminan).
 * Rumus: sewa bersih = sewa kotor - biaya operasional 20% - fee pengelolaan 5%
 * - PPh badan 22% atas laba; nilai per token = sewa bersih / 18.000 token.
 * Kalkulator resminya dibangun di backend/src/finance (jalur 1, progress 3).
 */

export type WaterfallKind = "total" | "deduction" | "result";

export interface WaterfallStep {
  label: string;
  /** Label pendek untuk ponsel. */
  shortLabel: string;
  amountIdr: number;
  kind: WaterfallKind;
}

/** Contoh periode November 2026: 9 dari 10 kamar terisi. */
export const monthlyWaterfall = {
  period: "2026-11",
  steps: [
    { label: "Sewa kotor", shortLabel: "Sewa kotor", amountIdr: 13_500_000, kind: "total" },
    {
      label: "Biaya operasional 20%",
      shortLabel: "Biaya operasional 20%",
      amountIdr: -2_700_000,
      kind: "deduction",
    },
    {
      label: "Fee pengelolaan 5%",
      shortLabel: "Fee pengelolaan 5%",
      amountIdr: -675_000,
      kind: "deduction",
    },
    { label: "PPh badan 22%", shortLabel: "PPh badan 22%", amountIdr: -2_227_500, kind: "deduction" },
    {
      label: "Dibagikan ke pemegang token",
      shortLabel: "Dibagikan",
      amountIdr: 7_897_500,
      kind: "result",
    },
  ] satisfies WaterfallStep[],
  totalTokens: 18_000,
  /** 7.897.500 / 18.000 = 438,75, dibulatkan menjadi Rp439. */
  payoutPerTokenIdr: 439,
};

export interface ProjectionRow {
  label: string;
  note?: string;
  amountIdr: number;
  /** Baris subtotal diberi garis atas tebal. */
  subtotal?: boolean;
}

/** Perkiraan per tahun (tab Keuangan di detail kos). */
export const annualProjection: ProjectionRow[] = [
  { label: "Sewa kotor", note: "10 kamar × Rp1.500.000 × 12 bulan × 90%", amountIdr: 162_000_000 },
  { label: "Biaya operasional", note: "20% dari sewa kotor", amountIdr: -32_400_000 },
  { label: "Fee pengelolaan KosBagi", note: "5% dari sewa kotor", amountIdr: -8_100_000 },
  { label: "Laba sebelum pajak", amountIdr: 121_500_000, subtotal: true },
  { label: "PPh badan", note: "22% dari laba, asumsi konservatif", amountIdr: -26_730_000 },
  {
    label: "Dibagikan ke pemegang token",
    note: "18.000 token",
    amountIdr: 94_770_000,
    subtotal: true,
  },
];

/** Hasil ringkas yang ditonjolkan di tab Keuangan. */
export const projectionHighlights = [
  { label: "Per token per bulan", value: "±Rp439" },
  { label: "Imbal per tahun", value: "±5,3%" },
  { label: "100 token per bulan", value: "±Rp43.900" },
] as const;

export const taxSensitivityNote =
  "Bila memenuhi PPh final 0,5% dari omzet, estimasi naik menjadi ±6,7% per tahun.";

/**
 * Angka untuk pemilik kos (bagian "Punya kos dekat kampus?" di beranda):
 * dana penawaran Rp1.260.000.000 - fee penawaran 3% = Rp1.222.200.000.
 */
export const ownerHighlights = {
  upfrontFundsIdr: 1_222_200_000,
  ownerShare: 0.3,
  tenantExtraFeeIdr: 0,
};
