"use client";

import { type ReactNode, useState } from "react";
import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  CheckIcon,
  TrayIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toApiError } from "@/lib/api/client";
import { formatDateTimeWib, formatMonthName, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  fetchReconciliation,
  reconciliationKey,
  type ReconciliationPayload,
  refreshReconciliation,
} from "./api";
import { COLUMN_COUNT, ReconciliationRow } from "./reconciliation-row";

/**
 * Lebar kolom dari serah terima desain P4, jumlahnya 1.120 px. Dipasang sebagai
 * persentase supaya tabel tetap pas saat area konten sedikit lebih sempit,
 * mis. karena scrollbar vertikal Windows (±15 px). Dengan lebar px, table-fixed
 * memaksa tabel selebar jumlah kolom dan memunculkan scrollbar horizontal.
 */
const COLUMNS = [
  { label: "order_id", width: 270, className: "pl-9 font-mono font-normal" },
  { label: "Jenis", width: 110 },
  { label: "Nominal", width: 150, className: "text-right" },
  { label: "Midtrans", width: 140 },
  { label: "Database", width: 140 },
  { label: "Sepolia", width: 170 },
  { label: "Hasil", width: 140 },
] as const;

const TABLE_WIDTH = COLUMNS.reduce((sum, column) => sum + column.width, 0);

const SKELETON_ROWS = ["baris-1", "baris-2", "baris-3", "baris-4", "baris-5", "baris-6"];

function monthOf(period: string): string {
  return formatMonthName(new Date(`${period}-15T00:00:00+07:00`));
}

function CountChip({ tone, children }: { tone: "match" | "mismatch"; children: ReactNode }) {
  const ChipIcon = tone === "match" ? CheckIcon : WarningCircleIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full py-1.5 pr-3 pl-2.5 text-sm leading-5 font-medium",
        tone === "match"
          ? "bg-success-muted text-success-muted-foreground"
          : "bg-destructive-muted text-destructive-muted-foreground"
      )}
    >
      <ChipIcon aria-hidden className="size-3.5" />
      {children}
    </span>
  );
}

function TableFrame({ children, busy }: { children: ReactNode; busy?: boolean }) {
  return (
    <div aria-busy={busy} className="overflow-hidden rounded-xl bg-card text-card-foreground">
      <Table className="min-w-[1040px] table-fixed">
        <colgroup>
          {COLUMNS.map((column) => (
            <col key={column.label} style={{ width: `${(column.width / TABLE_WIDTH) * 100}%` }} />
          ))}
        </colgroup>
        {children}
      </Table>
    </div>
  );
}

function TableHeadRow() {
  return (
    <TableHeader>
      <TableRow className="border-0 hover:bg-transparent">
        {COLUMNS.map((column) => (
          <TableHead key={column.label} className={cn("h-auto py-3", "className" in column && column.className)}>
            {column.label}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
}

/** Kerangka memuat (Figma: "Rekonsiliasi, memuat"). Dipakai juga halaman selagi URL dibaca. */
export function ReconciliationLoading() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <p className="sr-only">Mencocokkan data Midtrans, database, dan Sepolia.</p>
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-5 w-39 max-w-full" />
        <Skeleton className="h-3 w-64 max-w-full" />
        <Skeleton className="h-3 w-56 max-w-full" />
        <Skeleton className="h-3 w-46 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-xl bg-card px-3 py-1">
        {SKELETON_ROWS.map((key) => (
          <div key={key} className="flex h-16 items-center gap-6 border-b border-border px-3 last:border-b-0 md:max-w-[728px]">
            <Skeleton className="h-2.5 w-35" />
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="hidden h-2.5 w-19 sm:block" />
            <Skeleton className="hidden h-2.5 w-25 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, retrying, onRetry }: { message: string; retrying: boolean; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl bg-card text-card-foreground">
      <Empty className="rounded-xl border-0 px-6 py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="text-destructive">
            <WarningCircleIcon aria-hidden />
          </EmptyMedia>
          <EmptyTitle className="mt-2">Rekonsiliasi gagal dimuat</EmptyTitle>
          <EmptyDescription>{message}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" variant="outline" size="sm" disabled={retrying} aria-busy={retrying} onClick={onRetry}>
            <ArrowsClockwiseIcon aria-hidden data-icon="inline-start" className={retrying ? "animate-spin" : undefined} />
            Muat ulang
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}

function EmptyRows({ period, onlyMismatch }: { period: string; onlyMismatch: boolean }) {
  const EmptyIcon = onlyMismatch ? CheckCircleIcon : TrayIcon;
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={COLUMN_COUNT} className="h-auto px-6 py-10 whitespace-normal">
        <Empty className="border-0 p-0 sm:p-0">
          <EmptyHeader>
            <EmptyMedia className="text-foreground">
              <EmptyIcon aria-hidden className="size-5" />
            </EmptyMedia>
            <EmptyTitle className="text-sm leading-5 font-semibold">
              {onlyMismatch ? "Tidak ada selisih" : "Belum ada transaksi"}
            </EmptyTitle>
            <EmptyDescription>
              {onlyMismatch
                ? `Semua transaksi ${monthOf(period)} cocok di Midtrans, database, dan Sepolia.`
                : `Pembayaran sewa dan pembelian token ${monthOf(period)} muncul di sini setelah dibuat lewat Midtrans.`}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </TableCell>
    </TableRow>
  );
}

/**
 * Isi /admin/rekonsiliasi: ringkasan Cocok dan Selisih, tombol Hanya selisih
 * dan Periksa ulang, lalu tabel tiga sumber. Hanya membaca; tidak ada tombol
 * yang mengubah data pembayaran atau catatan on-chain. `period` null berarti
 * periode tagihan terbaru, dipilih backend.
 */
export function ReconciliationView({ period }: { period: string | null }) {
  const [onlyMismatch, setOnlyMismatch] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { mutate: mutateGlobal } = useSWRConfig();

  const key = reconciliationKey(period, onlyMismatch);
  // Backend menyimpan laporan 30 detik, jadi berpindah filter tidak menanyakan Midtrans lagi.
  const report = useSWR<ReconciliationPayload>(key, fetchReconciliation, {
    keepPreviousData: true,
    revalidateOnFocus: false,
  });

  async function refresh() {
    setRefreshing(true);
    try {
      const fresh = await refreshReconciliation(key);
      await report.mutate(fresh, { revalidate: false });
      // Laporan di filter lain kini usang; muat ulang saat dibuka.
      void mutateGlobal(reconciliationKey(period, !onlyMismatch), undefined, { revalidate: false });
    } catch (error) {
      toast.error("Rekonsiliasi belum diperiksa ulang", {
        description: toApiError(error).message,
        position: "bottom-center",
      });
    } finally {
      setRefreshing(false);
    }
  }

  const data = report.data;

  return (
    <div className="flex flex-col gap-5 p-4 md:p-8">
      {!data && report.error ? (
        <ErrorState
          message={toApiError(report.error).message}
          retrying={report.isValidating}
          onRetry={() => void report.mutate()}
        />
      ) : !data ? (
        <ReconciliationLoading />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div className="flex flex-wrap items-center gap-2.5" aria-live="polite">
              <p className="text-sm leading-5 font-medium text-foreground">
                {formatNumber(data.summary.total)} transaksi
              </p>
              <CountChip tone="match">Cocok {formatNumber(data.summary.matched)}</CountChip>
              <CountChip tone={data.summary.mismatched > 0 ? "mismatch" : "match"}>
                Selisih {formatNumber(data.summary.mismatched)}
              </CountChip>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs leading-4 text-muted-foreground">
                Diperiksa {formatDateTimeWib(data.summary.checkedAt)}
              </p>
              <Button
                type="button"
                variant={onlyMismatch ? "default" : "outline"}
                aria-pressed={onlyMismatch}
                onClick={() => setOnlyMismatch((value) => !value)}
              >
                Hanya selisih
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={refreshing}
                aria-busy={refreshing}
                onClick={() => void refresh()}
              >
                <ArrowsClockwiseIcon
                  aria-hidden
                  data-icon="inline-start"
                  className={refreshing ? "animate-spin motion-reduce:animate-none" : undefined}
                />
                Periksa ulang
              </Button>
            </div>
          </div>

          <TableFrame busy={report.isValidating || refreshing}>
            <TableHeadRow />
            <TableBody>
              {data.rows.length === 0 ? (
                <EmptyRows period={data.period} onlyMismatch={onlyMismatch} />
              ) : (
                data.rows.map((row) => <ReconciliationRow key={row.orderId} row={row} />)
              )}
            </TableBody>
          </TableFrame>
        </>
      )}
    </div>
  );
}
