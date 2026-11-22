"use client";

import { useState } from "react";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";

import { ClosePanel } from "@/components/admin/close-panel";
import { ClosePeriodDialog } from "@/components/admin/close-period-dialog";
import { ClosingReceipt } from "@/components/admin/closing-receipt";
import { distributedTotal, HolderShares } from "@/components/admin/holder-shares";
import { LoadError } from "@/components/common/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ADMIN_SUMMARY_KEY,
  adminJobsKey,
  fetchAdminJobs,
  fetchAdminSummary,
  retryAdminJob,
} from "@/lib/api/admin";
import { toApiError } from "@/lib/api/client";
import { expensesKey, fetchExpenses } from "@/lib/api/expenses";
import { closePeriod, distributePeriod, fetchPeriod, periodKey } from "@/lib/api/periods";
import type { PeriodPayload, PeriodRequirementDto } from "@/lib/api/types";
import { isPeriodReady, requirementRows } from "@/lib/admin";
import { kosSumbersari01 } from "@/lib/data/properties";
import { formatRupiah } from "@/lib/format";
import { periodMonthName, propertyPeriodCaption } from "@/lib/period";

/** Penutupan dan pencatatan yang ditunggu biasanya selesai kurang dari satu menit. */
const WATCH_REFRESH_MS = 5_000;

function needsWatching(payload: PeriodPayload): boolean {
  return payload.status === "CLOSING" || (payload.status === "OPEN" && !isPeriodReady(payload));
}

/** Data lain di halaman admin yang ikut berubah setelah penutupan atau distribusi. */
function isAdminDataKey(key: unknown): boolean {
  return typeof key === "string" && (key.startsWith("/admin/") || key.startsWith("/periods/"));
}

function readRequirements(details: unknown): PeriodRequirementDto[] | null {
  if (details && typeof details === "object" && "requirements" in details) {
    const value = (details as { requirements: unknown }).requirements;
    return Array.isArray(value) ? (value as PeriodRequirementDto[]) : null;
  }
  return null;
}

/** Kerangka halaman Tutup periode (Figma: Tutup periode, memuat). */
export function PeriodCloseSkeleton() {
  return (
    <div
      aria-busy="true"
      className="grid items-start gap-4 p-4 md:gap-6 md:p-8 xl:grid-cols-[560px_minmax(0,1fr)]"
    >
      <p className="sr-only">Memuat periode.</p>
      <div className="flex flex-col gap-3 rounded-xl bg-card p-6">
        <Skeleton className="h-3.5 w-30" />
        <Skeleton className="h-3 w-44" />
        <Skeleton className="h-9 w-80 max-w-full" />
        <Skeleton className="h-3 w-50 max-w-full" />
        <div className="mt-6 flex flex-col gap-3">
          {[1, 2, 3, 4].map((row) => (
            <Skeleton key={row} className="h-2.5 w-full" />
          ))}
        </div>
        <Skeleton className="mt-6 h-9 w-full rounded-full" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-5 w-55 max-w-full" />
          <Skeleton className="h-3 w-90 max-w-full" />
          <Skeleton className="h-3 w-65 max-w-full" />
        </div>
        <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-5">
          <Skeleton className="h-2.5 w-21" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-2.5 w-35" />
        </div>
      </div>
    </div>
  );
}

/**
 * Isi /admin/periode untuk satu periode: Struk penutupan di kiri dan kartu
 * syarat atau status penutupan di kanan, lalu Bagian pemegang setelah ditutup.
 * Tutup periode memakai Dialog konfirmasi lalu POST /periods/:period/close;
 * Jalankan distribusi (sekali saja) memanggil POST /periods/:period/distribute.
 */
function PeriodCloseContent({ period }: { period: string }) {
  const { mutate: mutateGlobal } = useSWRConfig();
  const [watch, setWatch] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [distributing, setDistributing] = useState(false);

  const query = useSWR(periodKey(period), fetchPeriod, {
    refreshInterval: watch ? WATCH_REFRESH_MS : 0,
    onSuccess: (payload) => setWatch(needsWatching(payload)),
  });
  // Nama kamar dan nota di kartu syarat diambil dari antrean job dan daftar biaya.
  const openJobs = useSWR(adminJobsKey("open"), fetchAdminJobs, {
    refreshInterval: watch ? WATCH_REFRESH_MS : 0,
  });
  const expenseBlocked = query.data?.requirements.some(
    (item) => item.key === "EXPENSE_UNRECORDED" && !item.ok
  );
  const expenses = useSWR(expenseBlocked ? expensesKey(period) : null, fetchExpenses, {
    refreshInterval: watch ? WATCH_REFRESH_MS : 0,
  });

  const { data, error, isValidating, mutate } = query;

  if (!data && error) {
    return (
      <div className="p-4 md:p-8">
        <LoadError title="Data periode gagal dimuat" retrying={isValidating} onRetry={() => void mutate()} />
      </div>
    );
  }
  if (!data) return <PeriodCloseSkeleton />;

  const payload = data;
  const ready = payload.status === "OPEN" && isPeriodReady(payload);
  const rows = requirementRows(payload, openJobs.data?.jobs, expenses.data?.expenses);
  const month = periodMonthName(period);

  function markClosing() {
    setWatch(true);
    void mutate((current) => current && { ...current, status: "CLOSING" }, { revalidate: true });
  }

  async function confirmClose() {
    setClosing(true);
    try {
      await closePeriod(period);
      setDialogOpen(false);
      markClosing();
    } catch (caught) {
      const failure = toApiError(caught);
      setDialogOpen(false);
      if (failure.code === "PERIOD_NOT_READY") {
        const requirements = readRequirements(failure.details);
        if (requirements) void mutate((current) => current && { ...current, requirements }, { revalidate: true });
        toast.error("Periode belum siap ditutup", { description: failure.message });
      } else if (failure.code === "PERIOD_ALREADY_CLOSED") {
        toast.info("Periode sudah ditutup", { description: "Status terbaru dimuat ulang." });
      } else {
        toast.error("Periode belum ditutup", { description: failure.message });
      }
      void mutate();
    } finally {
      setClosing(false);
      void mutateGlobal(isAdminDataKey);
    }
  }

  async function retryClose() {
    const jobId = payload.close?.job.id;
    if (!jobId) return;
    setRetrying(true);
    try {
      await retryAdminJob(jobId);
      markClosing();
    } catch (caught) {
      const failure = toApiError(caught);
      if (failure.code === "JOB_NOT_FAILED") {
        toast.info("Penutupan tidak lagi gagal", { description: "Status terbaru dimuat ulang." });
      } else {
        toast.error("Penutupan belum dikirim ulang", { description: failure.message });
      }
      void mutate();
    } finally {
      setRetrying(false);
      void mutateGlobal(isAdminDataKey);
    }
  }

  async function distribute() {
    setDistributing(true);
    try {
      const { distribution } = await distributePeriod(period);
      void mutate(
        (current) => current && { ...current, status: "DISTRIBUTED", distribution },
        { revalidate: true }
      );
      toast.success(`Distribusi ${month} selesai`, {
        description: `${formatRupiah(distributedTotal(distribution))} masuk ke saldo ${distribution.holders.length} pemegang.`,
      });
    } catch (caught) {
      const failure = toApiError(caught);
      if (failure.code === "ALREADY_DISTRIBUTED") {
        toast.info("Distribusi sudah pernah dijalankan", { description: "Hasilnya dimuat ulang." });
      } else if (failure.code === "CHAIN_UNAVAILABLE") {
        toast.error("Saldo snapshot belum bisa dibaca", {
          description: "Sepolia tidak merespons. Saldo belum berubah; coba lagi beberapa saat lagi.",
        });
      } else {
        toast.error("Distribusi belum dijalankan", { description: failure.message });
      }
      void mutate();
    } finally {
      setDistributing(false);
      void mutateGlobal(isAdminDataKey);
    }
  }

  const shares = payload.distribution ?? payload.preview ?? null;
  const showShares =
    shares !== null && (payload.status === "CLOSED" || payload.status === "DISTRIBUTED");

  return (
    <div className="grid items-start gap-4 p-4 md:gap-6 md:p-8 xl:grid-cols-[560px_minmax(0,1fr)]">
      <ClosingReceipt payload={payload} ready={ready} />
      <div className="flex min-w-0 flex-col gap-4 md:gap-6">
        <ClosePanel
          payload={payload}
          rows={rows}
          ready={ready}
          retrying={retrying}
          distributing={distributing}
          onRequestClose={() => setDialogOpen(true)}
          onRetryClose={() => void retryClose()}
          onDistribute={() => void distribute()}
        />
        {showShares ? (
          <HolderShares
            distribution={shares}
            distributed={payload.distribution !== null}
            snapshotBlock={payload.close?.snapshotBlock ?? null}
          />
        ) : null}
      </div>
      <ClosePeriodDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        period={period}
        receipt={payload.receipt}
        submitting={closing}
        onConfirm={() => void confirmClose()}
      />
    </div>
  );
}

/**
 * Isi /admin/periode. Dengan ?periode= halaman membuka periode itu; tanpa
 * parameter, periodenya diambil dari periode berjalan di GET /admin/summary,
 * bukan dari konstanta di frontend.
 */
export function PeriodCloseView({ period }: { period: string | null }) {
  const summary = useSWR(period ? null : ADMIN_SUMMARY_KEY, fetchAdminSummary);
  if (period) return <PeriodCloseContent period={period} />;
  if (!summary.data && summary.error) {
    return (
      <div className="p-4 md:p-8">
        <LoadError
          title="Periode berjalan gagal dimuat"
          retrying={summary.isValidating}
          onRetry={() => void summary.mutate()}
        />
      </div>
    );
  }
  if (!summary.data) return <PeriodCloseSkeleton />;
  return <PeriodCloseContent period={summary.data.currentPeriod.period} />;
}

/** Keterangan header: periode dari ?periode=, atau periode berjalan dari backend. */
export function PeriodCloseCaption({ period }: { period: string | null }) {
  const { data } = useSWR(period ? null : ADMIN_SUMMARY_KEY, fetchAdminSummary);
  const shown = period ?? data?.currentPeriod.period;
  return <>{shown ? propertyPeriodCaption(shown) : kosSumbersari01.name}</>;
}
