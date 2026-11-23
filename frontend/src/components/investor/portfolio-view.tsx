"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowSquareOutIcon, CopyIcon, TrayIcon } from "@phosphor-icons/react/ssr";
import useSWR from "swr";

import { LoadError } from "@/components/common/load-error";
import { DistributionTable, TransactionTable } from "@/components/investor/portfolio-tables";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchPortfolio,
  fetchPortfolioSummary,
  PORTFOLIO_KEY,
  PORTFOLIO_SUMMARY_KEY,
} from "@/lib/api/portfolio";
import type { HoldingDto, PortfolioPayload } from "@/lib/api/types";
import { copyToClipboard } from "@/lib/clipboard";
import { kosSumbersari01 } from "@/lib/data/properties";
import { etherscanAddressUrl, formatDate, formatNumber, formatRupiah } from "@/lib/format";
import { holdingCostIdr, holdingShare, isRunningPeriod } from "@/lib/investor";
import type { HexString } from "@/lib/types";

const PENDING_REFRESH_MS = 10_000;

function hasPendingTransaction(payload: PortfolioPayload): boolean {
  return payload.transactions.some((item) => item.chain && item.chain.status !== "RECORDED");
}

/** Kerangka portofolio (Figma: Investor / Portofolio / Memuat). */
function PortfolioSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4 p-4 md:gap-6 md:p-8">
      <p className="sr-only">Memuat portofolio.</p>
      <div className="grid gap-4 md:gap-6 xl:grid-cols-2">
        {["token", "dompet"].map((key) => (
          <div key={key} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-3.5 w-30" />
            <Skeleton className="h-7.5 w-40 max-w-full" />
            <Skeleton className="h-3 w-50 max-w-full" />
          </div>
        ))}
      </div>
      {["bagi-hasil", "riwayat"].map((key) => (
        <div key={key} className="flex flex-col gap-0 rounded-xl bg-card px-2.5 py-3">
          {[1, 2, 3].map((row) => (
            <div key={row} className="flex gap-4 border-b border-border px-2.5 py-3.5 xl:w-[60%]">
              <Skeleton className="h-2.5 w-31" />
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="h-2.5 w-17" />
              <Skeleton className="h-2.5 w-22" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PortfolioEmpty() {
  return (
    <div className="p-4 md:p-8">
      <section aria-label="Portofolio" className="rounded-xl bg-card px-6 py-16 text-card-foreground">
        <Empty className="border-0 p-0 sm:p-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TrayIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle className="mt-2">Belum ada token di portofoliomu</EmptyTitle>
            <EmptyDescription>
              Token yang kamu beli, bagi hasil tiap periode, dan buktinya di Sepolia akan muncul di
              sini.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/investor/penawaran">Lihat penawaran</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </section>
    </div>
  );
}

function TokenCard({ holding, payload }: { holding: HoldingDto; payload: PortfolioPayload }) {
  const purchases = payload.transactions.filter((item) => item.type === "PURCHASE");
  const paid = purchases.reduce((sum, item) => sum + (item.amountIdr ?? 0), 0);
  const cost = paid > 0 ? paid : holdingCostIdr(holding.tokenBalance);
  const firstPurchase = purchases.at(-1);
  const purchaseNote = firstPurchase
    ? purchases.length > 1
      ? ` Pembelian pertama ${formatDate(firstPurchase.occurredAt)}.`
      : ` Dibeli ${formatDate(firstPurchase.occurredAt)}.`
    : "";

  return (
    <section
      aria-labelledby="judul-token"
      className="flex min-w-0 flex-col gap-2.5 rounded-xl bg-card px-6 py-6 text-card-foreground md:px-8 md:py-7"
    >
      <div className="flex items-center gap-2.5">
        <span className="rounded-[6px] bg-muted px-2 py-[3px] font-mono text-xs leading-4 text-foreground">
          {holding.tokenSymbol}
        </span>
        <h2 id="judul-token" className="text-sm leading-5 font-medium">
          {kosSumbersari01.name}
        </h2>
      </div>
      <p className="text-number-lg font-semibold tabular-nums md:text-number-hero">
        {formatNumber(holding.tokenBalance)} token
      </p>
      <p className="text-sm leading-5 text-muted-foreground">
        Nilai beli {formatRupiah(cost)}, atau {holdingShare(holding.tokenBalance)} dari{" "}
        {formatNumber(kosSumbersari01.totalTokens)} token.{purchaseNote}
      </p>
    </section>
  );
}

function WalletCard({ address }: { address: HexString }) {
  return (
    <section
      aria-labelledby="judul-dompet"
      className="flex min-w-0 flex-col gap-3 rounded-xl bg-card p-6 text-card-foreground md:p-7"
    >
      <h2 id="judul-dompet" className="text-sm leading-5 font-medium text-muted-foreground">
        Dompet kustodian
      </h2>
      <p className="font-mono text-sm leading-5 break-all">{address}</p>
      <p className="text-sm leading-5 text-muted-foreground">
        Dompet ini dikelola KosBagi untukmu, jadi kamu tidak perlu memegang ETH. Saldonya bisa
        diperiksa siapa pun di Etherscan.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline">
          <a href={etherscanAddressUrl(address)} target="_blank" rel="noopener noreferrer">
            Lihat di Etherscan
            <ArrowSquareOutIcon aria-hidden data-icon="inline-end" />
            <span className="sr-only">(membuka tab baru)</span>
          </a>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => void copyToClipboard(address, "Alamat dompet disalin")}
        >
          <CopyIcon aria-hidden data-icon="inline-start" />
          Salin alamat
        </Button>
      </div>
    </section>
  );
}

/**
 * Isi /investor/portofolio: kepemilikan token dan dompet kustodian, tabel bagi
 * hasil per periode (dengan baris periode berjalan dari ringkasan), dan riwayat
 * transaksi beserta status on-chain ringkas.
 */
export function PortfolioView() {
  const [watch, setWatch] = useState(false);
  const portfolio = useSWR(PORTFOLIO_KEY, fetchPortfolio, {
    refreshInterval: watch ? PENDING_REFRESH_MS : 0,
    onSuccess: (data) => setWatch(hasPendingTransaction(data)),
  });
  // Periode berjalan untuk baris terakhir tabel bagi hasil (kunci yang sama dengan /investor).
  const summary = useSWR(PORTFOLIO_SUMMARY_KEY, fetchPortfolioSummary);

  if (!portfolio.data && portfolio.error) {
    return (
      <div className="p-4 md:p-8">
        <LoadError
          title="Portofolio gagal dimuat"
          retrying={portfolio.isValidating}
          onRetry={() => void portfolio.mutate()}
        />
      </div>
    );
  }
  if (!portfolio.data) return <PortfolioSkeleton />;

  const data = portfolio.data;
  if (!data.holding && data.transactions.length === 0 && data.distributions.length === 0) {
    return <PortfolioEmpty />;
  }

  const walletAddress = data.wallet?.address ?? data.holding?.walletAddress ?? null;
  const current = summary.data?.currentPeriod;
  const runningPeriod = current && isRunningPeriod(current.status) ? current.period : null;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="grid items-start gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
        {data.holding ? <TokenCard holding={data.holding} payload={data} /> : null}
        {walletAddress ? <WalletCard address={walletAddress} /> : null}
      </div>

      <section aria-labelledby="judul-bagi-hasil" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="judul-bagi-hasil" className="text-h4 font-semibold">
            Bagi hasil per periode
          </h2>
          <p className="text-sm leading-5 text-muted-foreground">
            Dihitung dari saldomu di blok snapshot saat admin menutup periode.
          </p>
        </div>
        <DistributionTable distributions={data.distributions} runningPeriod={runningPeriod} />
      </section>

      <section aria-labelledby="judul-riwayat" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="judul-riwayat" className="text-h4 font-semibold">
            Riwayat transaksi
          </h2>
          <p className="text-sm leading-5 text-muted-foreground">
            Semua perubahan saldo token dan bagi hasil, dengan bukti di Sepolia.
          </p>
        </div>
        <TransactionTable transactions={data.transactions} />
      </section>
    </div>
  );
}
