"use client";

import { useState } from "react";

import { RentRecordedChart } from "@/components/investor/rent-recorded-chart";
import { Button } from "@/components/ui/button";
import type { PortfolioDistributionDto, PortfolioSummaryPayload } from "@/lib/api/types";
import {
  formatDate,
  formatNumber,
  formatPeriod,
  formatRupiah,
  formatSen,
} from "@/lib/format";
import { buildRentChart, feedStatus, isRunningPeriod } from "@/lib/investor";
import { countWord } from "@/lib/period";
import { estimateMonthlyPayout } from "@/lib/purchase";
import { cn } from "@/lib/utils";

const DEFAULT_WITHDRAW_REASON = "Penarikan dibuka setelah disbursement sandbox tersedia.";

/** Keterangan di bawah saldo: dari distribusi mana saldo itu berasal. */
function balanceCaption(
  summary: PortfolioSummaryPayload,
  distribution: PortfolioDistributionDto | undefined
): string {
  const last = summary.lastDistribution;
  if (!last) {
    return `Belum ada distribusi. Bagi hasil pertama masuk setelah periode ${formatPeriod(summary.currentPeriod.period)} ditutup admin.`;
  }
  if (summary.balanceIdr !== last.amountIdr) {
    return `Termasuk distribusi ${formatPeriod(last.period)} sebesar ${formatRupiah(last.amountIdr)}.`;
  }
  if (distribution) {
    return `Dari distribusi ${formatPeriod(last.period)}: ${formatNumber(distribution.tokenBalance)} token × ${formatSen(distribution.valuePerTokenSen)}.`;
  }
  return `Dari distribusi ${formatPeriod(last.period)}, masuk ${formatDate(last.distributedAt)}.`;
}

/** Keterangan di bawah judul grafik: berapa kamar tercatat dan apa yang masih ditunggu. */
function chartCaption(summary: PortfolioSummaryPayload): string {
  const current = summary.currentPeriod;
  const recorded = `${current.roomsRecorded} dari ${current.roomsTotal} kamar terisi.`;
  if (!isRunningPeriod(current.status)) {
    const last = summary.lastDistribution;
    return last?.period === current.period
      ? `${recorded} Periode ditutup, bagi hasil masuk ${formatDate(last.distributedAt)}.`
      : `${recorded} Periode sudah ditutup.`;
  }
  const pending = current.rentFeed.filter((item) => feedStatus(item) === "PENDING").length;
  if (pending > 0) {
    return `${recorded} ${countWord(pending)} pembayaran lunas masih menunggu pencatatan.`;
  }
  return current.roomsRecorded >= current.roomsTotal
    ? `${recorded} Semua sewa sudah tercatat.`
    : `${recorded} Diperbarui setiap ada pembayaran.`;
}

interface PayoutBalanceCardProps {
  summary: PortfolioSummaryPayload;
  /** Rincian distribusi terakhir dari GET /portfolio, untuk menulis "100 token × Rp438,75". */
  lastDistributionDetail?: PortfolioDistributionDto;
  className?: string;
}

/**
 * Kartu saldo bagi hasil (Figma: "Kartu saldo bagi hasil"). Selalu memakai mode
 * Gelap lokal (class "dark") seperti mockup ponsel di beranda. Tarik saldo
 * tampil tetapi nonaktif dengan keterangannya, karena prototipe belum punya
 * disbursement. Grafiknya menjumlahkan sewa tercatat (event RentRecorded) per
 * tanggal bayar.
 */
export function PayoutBalanceCard({
  summary,
  lastDistributionDetail,
  className,
}: PayoutBalanceCardProps) {
  // Waktu dibaca sekali saat kartu dipasang; cukup untuk posisi garis "Hari ini".
  const [now] = useState(() => new Date());
  const current = summary.currentPeriod;
  const model = buildRentChart(current, now);
  const running = isRunningPeriod(current.status);
  const tokens = summary.holding?.tokenBalance ?? 0;
  const reason = summary.withdraw.reason ?? DEFAULT_WITHDRAW_REASON;
  const periodName = formatPeriod(current.period);

  return (
    <section
      aria-labelledby="judul-saldo"
      className={cn(
        "dark flex min-w-0 flex-col gap-6 rounded-xl bg-card px-5 py-6 text-card-foreground md:px-8 md:py-7",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="judul-saldo" className="text-sm leading-5 font-medium text-muted-foreground">
          Saldo bagi hasil
        </h2>
        <span className="rounded-[6px] bg-muted px-2 py-[3px] font-mono text-xs leading-4 text-foreground">
          {summary.holding?.tokenSymbol ?? "KB-SMR01"}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-number-lg font-semibold tabular-nums md:text-number-hero">
          {formatRupiah(summary.balanceIdr)}
        </p>
        <p className="text-sm leading-5 text-muted-foreground">
          {balanceCaption(summary, lastDistributionDetail)}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3.5">
        <Button
          type="button"
          disabled={!summary.withdraw.enabled}
          aria-describedby="keterangan-tarik-saldo"
          className="self-start"
        >
          Tarik saldo
        </Button>
        <p id="keterangan-tarik-saldo" className="flex-1 text-xs leading-4 text-muted-foreground">
          {reason}
        </p>
      </div>

      <div className="flex flex-col gap-5 border-t border-border pt-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h3 className="text-sm leading-5 font-semibold">Sewa tercatat di Sepolia, {periodName}</h3>
            <p className="text-xs leading-4 text-muted-foreground">{chartCaption(summary)}</p>
          </div>
          <p className="shrink-0 text-number-md font-semibold text-success tabular-nums">
            {formatRupiah(current.recordedRentIdr)}
          </p>
        </div>
        <RentRecordedChart
          model={model}
          period={current.period}
          label={`Grafik sewa tercatat ${periodName}: ${formatRupiah(current.recordedRentIdr)} dari ${formatRupiah(model.targetIdr)}, ${model.steps.length} tanggal pembayaran.`}
        />
      </div>

      <p className="text-xs leading-4 text-muted-foreground">
        {running && tokens > 0
          ? `Perkiraan bagianmu bila ${current.roomsTotal} kamar membayar: ±${formatRupiah(estimateMonthlyPayout(tokens))}. Angka final setelah periode ditutup.`
          : "Dihitung dari event RentRecorded dan PeriodClosed di kontrak KosLedger."}
      </p>
    </section>
  );
}
