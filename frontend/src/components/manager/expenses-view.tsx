"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InfoIcon, TrayIcon, UploadSimpleIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import useSWR from "swr";

import { LoadError } from "@/components/common/load-error";
import { ExpenseSheet } from "@/components/manager/expense-sheet";
import { ExpenseTable, ExpenseTableSkeleton } from "@/components/manager/expense-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { expensesKey, fetchExpenses } from "@/lib/api/expenses";
import type { ExpenseDto } from "@/lib/api/types";
import { expensesCaption, expensesHavePending } from "@/lib/expenses";
import { formatPeriod, formatRupiah } from "@/lib/format";
import { nextPeriod, periodMonthName } from "@/lib/period";

const PENDING_REFRESH_MS = 5_000;

/** Kerangka halaman biaya (Figma: Pengelola / Biaya / Memuat). */
export function ExpensesSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5 p-4 md:p-8">
      <p className="sr-only">Memuat biaya dan nota.</p>
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-5 w-55 max-w-full" />
        <Skeleton className="h-3 w-90 max-w-full" />
        <Skeleton className="h-3 w-65 max-w-full" />
      </div>
      <ExpenseTableSkeleton />
    </div>
  );
}

/**
 * Isi /pengelola/biaya: total biaya periode, tombol Catat biaya, dan tabel
 * Baris biaya (GET /expenses). Tanpa periode, backend memakai periode berjalan.
 * Setelah periode ditutup, biaya periode itu hanya bisa dibaca dan tombolnya
 * mencatat biaya ke periode berikutnya. Daftar dipantau ulang selama ada nota
 * yang menunggu pencatatan.
 */
export function ExpensesView({ period: requestedPeriod }: { period: string | null }) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [watch, setWatch] = useState(false);
  const { data, error, isValidating, mutate } = useSWR(expensesKey(requestedPeriod), fetchExpenses, {
    refreshInterval: watch ? PENDING_REFRESH_MS : 0,
    onSuccess: (payload) => setWatch(expensesHavePending(payload)),
  });

  if (!data && error) {
    return (
      <div className="p-4 md:p-8">
        <LoadError title="Biaya dan nota gagal dimuat" retrying={isValidating} onRetry={() => void mutate()} />
      </div>
    );
  }
  if (!data) return <ExpensesSkeleton />;

  // Periode yang benar-benar ditampilkan: dari ?periode=, atau periode berjalan dari backend.
  const period = data.period;
  const month = periodMonthName(period);
  const sheetPeriod = data.closed ? nextPeriod(period) : period;

  function handleRecorded(expense: ExpenseDto) {
    setSheetOpen(false);
    toast.success(`Biaya ${expense.category.label.toLowerCase()} dicatat`, {
      description: "Hash nota sedang dicatat di KosLedger.",
    });
    if (expense.period !== period) {
      router.push(`/pengelola/biaya?periode=${expense.period}`);
      return;
    }
    setWatch(true);
    void mutate(
      (current) =>
        current && {
          ...current,
          expenses: [expense, ...current.expenses.filter((item) => item.id !== expense.id)],
          totals: {
            ...current.totals,
            count: current.totals.count + 1,
            totalIdr: current.totals.totalIdr + expense.amountIdr,
            pendingIdr: current.totals.pendingIdr + expense.amountIdr,
          },
        },
      { revalidate: true }
    );
  }

  return (
    <div className="flex flex-col gap-5 p-4 md:p-8">
      {data.closed ? (
        <Alert variant="info">
          <InfoIcon aria-hidden />
          <AlertTitle>Periode {formatPeriod(period)} sudah ditutup</AlertTitle>
          <AlertDescription>
            Biaya {month} tidak bisa diubah lagi. Biaya baru masuk ke periode{" "}
            {formatPeriod(sheetPeriod)}.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm leading-5 font-medium text-muted-foreground">Total biaya {month}</h2>
          <p className="text-number-lg font-semibold tabular-nums">{formatRupiah(data.totals.totalIdr)}</p>
          <p className="text-sm leading-5 text-muted-foreground">{expensesCaption(data)}</p>
        </div>
        <Button type="button" className="self-start sm:self-auto" onClick={() => setSheetOpen(true)}>
          <UploadSimpleIcon aria-hidden data-icon="inline-start" />
          {data.closed ? `Catat biaya ${periodMonthName(sheetPeriod)}` : "Catat biaya"}
        </Button>
      </div>

      {data.expenses.length === 0 ? (
        <section aria-label={`Biaya ${month}`} className="rounded-xl bg-card px-6 py-16 text-card-foreground">
          <Empty className="border-0 p-0 sm:p-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TrayIcon aria-hidden />
              </EmptyMedia>
              <EmptyTitle className="mt-2">Belum ada biaya {month}</EmptyTitle>
              <EmptyDescription>
                Catat biaya beserta notanya. Hash nota dicatat di KosLedger dan ikut dihitung saat
                periode ditutup.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </section>
      ) : (
        <ExpenseTable expenses={data.expenses} />
      )}

      <ExpenseSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        period={sheetPeriod}
        categories={data.categories}
        onRecorded={handleRecorded}
      />
    </div>
  );
}
