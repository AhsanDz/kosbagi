"use client";

import Link from "next/link";
import { CaretRightIcon } from "@phosphor-icons/react/ssr";
import useSWR from "swr";

import { JobQueue } from "@/components/admin/job-queue";
import { LoadError } from "@/components/common/load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ADMIN_SUMMARY_KEY,
  adminJobsKey,
  fetchAdminJobs,
  fetchAdminSummary,
  fetchReconciliationSummary,
  RECONCILIATION_SUMMARY_KEY,
} from "@/lib/api/admin";
import { fetchPeriod, periodKey } from "@/lib/api/periods";
import type {
  AdminSummaryPayload,
  PeriodPayload,
  ReconciliationSummaryPayload,
} from "@/lib/api/types";
import { periodReadinessText } from "@/lib/admin";
import { kosSumbersari01 } from "@/lib/data/properties";
import { formatPeriod, formatRupiah, formatSen } from "@/lib/format";
import { propertyPeriodCaption } from "@/lib/period";
import { cn } from "@/lib/utils";

function Figure({
  label,
  value,
  caption,
  first = false,
}: {
  label: string;
  value: string | null;
  caption: string | null;
  first?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1",
        first ? "sm:pr-5" : "sm:border-l sm:border-border sm:px-5"
      )}
    >
      <dt className="text-xs leading-4 text-muted-foreground">{label}</dt>
      <dd className="text-number-md font-semibold tabular-nums">
        {value ?? <Skeleton className="mt-1 h-5 w-28" />}
      </dd>
      {caption ? <dd className="text-xs leading-4 text-muted-foreground">{caption}</dd> : null}
    </div>
  );
}

/** Kartu Periode berjalan (Figma: Admin / Ringkasan). Angka dari struk GET /periods/:period. */
function PeriodCard({
  summary,
  period,
  openJobs,
}: {
  summary: AdminSummaryPayload;
  period: PeriodPayload | undefined;
  openJobs: Parameters<typeof periodReadinessText>[1];
}) {
  const current = summary.currentPeriod;
  const receipt = period?.receipt;
  const closed = period?.status === "CLOSED" || period?.status === "DISTRIBUTED";
  const expenseTotal = receipt
    ? receipt.expensesRecorded +
      (period.requirements.find((item) => item.key === "EXPENSE_UNRECORDED")?.count ?? 0)
    : null;
  const readiness = period ? periodReadinessText(period, openJobs) : null;

  return (
    <section
      aria-labelledby="judul-periode-berjalan"
      className="flex min-w-0 flex-col gap-5 rounded-xl bg-card px-6 py-6 text-card-foreground md:px-8 md:py-7"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm leading-5 font-medium text-muted-foreground">Periode berjalan</p>
          <h2 id="judul-periode-berjalan" className="text-h3 font-semibold">
            {formatPeriod(current.period)}
          </h2>
        </div>
        <Button asChild variant="outline" className="self-start">
          <Link href={`/admin/periode?periode=${current.period}`}>Buka tutup periode</Link>
        </Button>
      </div>
      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-0">
        <Figure
          first
          label="Sewa tercatat"
          value={receipt ? formatRupiah(receipt.grossRentIdr) : null}
          caption={`${receipt?.roomsRecorded ?? current.roomsRecorded} dari ${receipt?.roomsTotal ?? current.roomsTotal} kamar terisi`}
        />
        <Figure
          label="Biaya tercatat"
          value={receipt ? formatRupiah(receipt.expensesIdr) : formatRupiah(current.expensesIdr)}
          caption={receipt && expenseTotal !== null ? `${receipt.expensesRecorded} dari ${expenseTotal} nota` : null}
        />
        <Figure
          label={closed ? "Nilai per token" : "Perkiraan per token"}
          value={receipt ? formatSen(receipt.valuePerTokenSen) : null}
          caption={closed ? "tercatat di KosLedger" : "bila ditutup sekarang"}
        />
      </dl>
      {readiness ? (
        <p className={cn("text-sm leading-5", readiness.blocked ? "text-destructive" : "text-card-foreground")}>
          {readiness.text}
        </p>
      ) : null}
    </section>
  );
}

function AttentionItem({
  href,
  label,
  value,
  alert,
  first = false,
}: {
  href: string;
  label: string;
  value: string;
  alert: boolean;
  first?: boolean;
}) {
  return (
    <li className={cn(!first && "border-t border-border")}>
      <Link
        href={href}
        className="flex items-center justify-between gap-3 rounded-sm py-3 text-sm leading-5 hover:bg-muted/40"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-muted-foreground">{label}</span>
          <span className={cn("font-medium", alert ? "text-destructive" : "text-card-foreground")}>{value}</span>
        </span>
        <CaretRightIcon aria-hidden className="size-4 shrink-0" />
      </Link>
    </li>
  );
}

/**
 * Kartu Perlu perhatian: KYC, rekonsiliasi (jalur 1), antrean job, dan bila ada,
 * pembayaran sewa yang masuk setelah periode ditutup sehingga dananya perlu
 * dikembalikan (rinciannya di halaman rekonsiliasi).
 */
function AttentionCard({
  summary,
  reconciliation,
  reconciliationFailed,
}: {
  summary: AdminSummaryPayload;
  reconciliation: ReconciliationSummaryPayload | undefined;
  reconciliationFailed: boolean;
}) {
  const { attention } = summary;
  let reconValue: string;
  let reconAlert = false;
  if (reconciliation) {
    reconAlert = reconciliation.mismatched > 0;
    reconValue = reconAlert
      ? `${reconciliation.mismatched} selisih perlu dicek`
      : "Semua transaksi cocok";
  } else if (reconciliationFailed) {
    reconAlert = attention.anomaliesOpen > 0;
    reconValue = reconAlert
      ? `${attention.anomaliesOpen} anomali pembayaran terbuka`
      : "Ringkasan belum bisa dimuat";
  } else {
    reconValue = "Memeriksa tiga sumber";
  }

  const jobValue =
    attention.jobsFailed > 0
      ? `${attention.jobsFailed} job gagal`
      : attention.jobsPending > 0
        ? `${attention.jobsPending} job menunggu pencatatan`
        : "Tidak ada job gagal";

  return (
    <section
      aria-labelledby="judul-perlu-perhatian"
      className="flex flex-col rounded-xl bg-card px-6 pt-6 pb-4 text-card-foreground"
    >
      <h2 id="judul-perlu-perhatian" className="text-h5 font-semibold">
        Perlu perhatian
      </h2>
      <ul className="mt-1">
        <AttentionItem
          first
          href="/admin/kyc"
          label="Verifikasi KYC"
          value={
            attention.kycSubmitted > 0
              ? `${attention.kycSubmitted} pengajuan menunggu`
              : "Tidak ada pengajuan menunggu"
          }
          alert={false}
        />
        <AttentionItem href="/admin/rekonsiliasi" label="Rekonsiliasi" value={reconValue} alert={reconAlert} />
        <AttentionItem href="#antrean-job" label="Antrean job" value={jobValue} alert={attention.jobsFailed > 0} />
        {attention.refundsPending && attention.refundsPending > 0 ? (
          <AttentionItem
            href="/admin/rekonsiliasi"
            label="Dana perlu dikembalikan"
            value={`${attention.refundsPending} pembayaran setelah periode ditutup`}
            alert
          />
        ) : null}
      </ul>
    </section>
  );
}

/** Kerangka ringkasan admin (Figma: Admin / Ringkasan / Memuat). */
function AdminOverviewSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6 p-4 md:p-8">
      <p className="sr-only">Memuat ringkasan admin.</p>
      <div className="grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {["periode", "perhatian"].map((key) => (
          <div key={key} className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-2.5 w-21" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-2.5 w-35" />
          </div>
        ))}
      </div>
      <div className="flex flex-col rounded-xl bg-card px-2.5 py-3">
        {[1, 2, 3].map((row) => (
          <div key={row} className="flex gap-4 border-b border-border px-2.5 py-3.5 xl:w-[60%]">
            <Skeleton className="h-2.5 w-31" />
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="h-2.5 w-17" />
            <Skeleton className="h-2.5 w-22" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Keterangan header ringkasan admin, mengikuti periode berjalan dari backend. */
export function AdminHeaderCaption() {
  const { data } = useSWR(ADMIN_SUMMARY_KEY, fetchAdminSummary);
  return <>{data ? propertyPeriodCaption(data.currentPeriod.period) : kosSumbersari01.name}</>;
}

/**
 * Isi /admin: kartu Periode berjalan (angka dari struk sementara), kartu Perlu
 * perhatian yang menautkan ke KYC, rekonsiliasi, dan antrean, lalu Antrean job
 * on-chain dengan tab dan Coba lagi.
 */
export function AdminOverview() {
  const summary = useSWR(ADMIN_SUMMARY_KEY, fetchAdminSummary);
  const currentPeriod = summary.data?.currentPeriod.period;
  const period = useSWR(currentPeriod ? periodKey(currentPeriod) : null, fetchPeriod);
  const openJobs = useSWR(adminJobsKey("open"), fetchAdminJobs);
  // Modul rekonsiliasi milik jalur 1; halaman tetap jalan walau endpoint-nya belum ada.
  const reconciliation = useSWR(RECONCILIATION_SUMMARY_KEY, fetchReconciliationSummary, {
    shouldRetryOnError: false,
  });

  if (!summary.data && summary.error) {
    return (
      <div className="p-4 md:p-8">
        <LoadError
          title="Ringkasan admin gagal dimuat"
          retrying={summary.isValidating}
          onRetry={() => void summary.mutate()}
        />
      </div>
    );
  }
  if (!summary.data) return <AdminOverviewSkeleton />;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8">
      <div className="grid items-start gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <PeriodCard summary={summary.data} period={period.data} openJobs={openJobs.data?.jobs} />
        <AttentionCard
          summary={summary.data}
          reconciliation={reconciliation.data}
          reconciliationFailed={Boolean(reconciliation.error)}
        />
      </div>
      <JobQueue />
    </div>
  );
}
