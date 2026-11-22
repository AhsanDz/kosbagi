"use client";

import { useState } from "react";
import useSWR from "swr";

import { LoadError } from "@/components/common/load-error";
import { HoldingStrip } from "@/components/investor/holding-strip";
import { NoTokenCard } from "@/components/investor/no-token-card";
import { PayoutBalanceCard } from "@/components/investor/payout-balance-card";
import { RentFeedCard } from "@/components/investor/rent-feed-card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchPortfolio,
  fetchPortfolioSummary,
  PORTFOLIO_KEY,
  PORTFOLIO_SUMMARY_KEY,
} from "@/lib/api/portfolio";
import { kosSumbersari01 } from "@/lib/data/properties";
import { formatPeriod } from "@/lib/format";
import { summaryHasPending } from "@/lib/investor";

/** Sewa yang menunggu pencatatan biasanya tercatat kurang dari satu menit. */
const PENDING_REFRESH_MS = 10_000;

function SkeletonCard({ lines, className }: { lines: number; className?: string }) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-3 rounded-xl bg-card p-5">
        <Skeleton className="h-5 w-21" />
        <Skeleton className="h-3.5 w-31 max-w-full" />
        <Skeleton className="h-9 w-55 max-w-full" />
        <Skeleton className="h-3.5 w-35 max-w-full" />
        <div className="mt-7 flex flex-col gap-3">
          {Array.from({ length: lines }, (_, index) => (
            <Skeleton key={index} className="h-2.5 w-full" />
          ))}
        </div>
        <Skeleton className="mt-7 h-7.5 w-full rounded-full" />
      </div>
    </div>
  );
}

/** Kerangka ringkasan investor (Figma: Investor / Ringkasan / Memuat). */
function InvestorOverviewSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4 p-4 md:gap-6 md:p-8">
      <p className="sr-only">Memuat ringkasan investor.</p>
      <div className="grid items-start gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_432px]">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
      <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-2.5 w-21" />
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-2.5 w-35" />
      </div>
    </div>
  );
}

/** Keterangan di header: periode berjalan, atau distribusi yang baru masuk. */
export function InvestorHeaderCaption() {
  const { data } = useSWR(PORTFOLIO_SUMMARY_KEY, fetchPortfolioSummary);
  if (!data) return <>{kosSumbersari01.name}</>;
  const { currentPeriod, lastDistribution } = data;
  if (lastDistribution && lastDistribution.period === currentPeriod.period) {
    return (
      <>
        {kosSumbersari01.name}, distribusi {formatPeriod(lastDistribution.period)} sudah masuk
      </>
    );
  }
  return (
    <>
      {kosSumbersari01.name}, periode {formatPeriod(currentPeriod.period)}
    </>
  );
}

/**
 * Isi /investor: Kartu saldo bagi hasil (gelap) di kiri, Daftar sewa masuk
 * 432 px di kanan, lalu jalur kepemilikan. Investor yang belum memegang token
 * melihat kartu ajakan ke penawaran sebagai ganti Kartu saldo. Data dipantau
 * ulang selama ada sewa yang menunggu pencatatan.
 */
export function InvestorOverview() {
  const [watch, setWatch] = useState(false);
  const summary = useSWR(PORTFOLIO_SUMMARY_KEY, fetchPortfolioSummary, {
    refreshInterval: watch ? PENDING_REFRESH_MS : 0,
    onSuccess: (data) => setWatch(summaryHasPending(data)),
  });
  // Rincian distribusi terakhir (jumlah token dan nilai per token) ada di GET /portfolio.
  const portfolio = useSWR(summary.data?.lastDistribution ? PORTFOLIO_KEY : null, fetchPortfolio);

  if (!summary.data && summary.error) {
    return (
      <div className="p-4 md:p-8">
        <LoadError
          title="Ringkasan investor gagal dimuat"
          retrying={summary.isValidating}
          onRetry={() => void summary.mutate()}
        />
      </div>
    );
  }
  if (!summary.data) return <InvestorOverviewSkeleton />;

  const data = summary.data;
  const detail = portfolio.data?.distributions.find(
    (item) => item.period === data.lastDistribution?.period
  );

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-8">
      <div className="grid items-start gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_432px]">
        {data.holding ? (
          <PayoutBalanceCard summary={data} lastDistributionDetail={detail} />
        ) : (
          <NoTokenCard />
        )}
        <RentFeedCard current={data.currentPeriod} />
      </div>
      {data.holding ? <HoldingStrip holding={data.holding} /> : null}
    </div>
  );
}
