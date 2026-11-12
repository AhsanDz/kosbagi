import { ArrowsClockwiseIcon, TrayIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";

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
import { formatMonthName } from "@/lib/format";
import { cn } from "@/lib/utils";

const HISTORY_ROWS = ["baris-1", "baris-2", "baris-3", "baris-4"];

/** Bentuk Skeleton "Slip" di Figma. */
export function BillSlipSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3.5 rounded-xl bg-card p-7", className)}>
      <Skeleton className="h-6 w-30 rounded-full" />
      <Skeleton className="h-[18px] w-45 max-w-full" />
      <Skeleton className="h-13 w-80 max-w-full rounded-[10px]" />
      <Skeleton className="h-3.5 w-50 max-w-full" />
      <div className="h-4" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-full" />
      <div className="h-4" />
      <Skeleton className="h-11 w-full rounded-full" />
    </div>
  );
}

/** Skeleton "Paragraf", pengganti Jejak pembayaran selagi memuat. */
export function TrailSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex-col gap-2.5 rounded-xl bg-card p-6", className)}>
      <Skeleton className="h-5 w-55 max-w-full" />
      <Skeleton className="h-3 w-90 max-w-full" />
      <Skeleton className="h-3 w-80 max-w-full" />
      <Skeleton className="h-3 w-65 max-w-full" />
    </div>
  );
}

/** Skeleton "Baris tabel", pengganti Kartu riwayat selagi memuat. */
export function HistorySkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-xl bg-card py-3", className)}>
      {HISTORY_ROWS.map((key) => (
        <div key={key} className="flex h-[52px] items-center gap-8 border-b border-border px-4">
          <Skeleton className="h-3 w-50 max-w-1/2" />
          <Skeleton className="h-3 w-22.5" />
          <Skeleton className="hidden h-3 w-27.5 sm:block" />
        </div>
      ))}
    </div>
  );
}

/** Tagihan bulan ini belum terbit. Penanda hari ini hanya dipakai untuk nama bulan. */
export function EmptyBillCard({ className }: { className?: string }) {
  return (
    <section
      aria-label="Tagihan bulan berjalan"
      className={cn("rounded-xl bg-card text-card-foreground", className)}
    >
      <Empty className="rounded-xl border-0 px-6 py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TrayIcon aria-hidden />
          </EmptyMedia>
          <EmptyTitle className="mt-2">
            Tagihan {formatMonthName(new Date())} belum terbit
          </EmptyTitle>
          <EmptyDescription>Tagihan baru muncul saat periode dibuka.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </section>
  );
}

interface BillingErrorProps {
  retrying: boolean;
  onRetry: () => void;
}

/** State error halaman penghuni: pesan dan tombol Muat ulang. */
export function BillingError({ retrying, onRetry }: BillingErrorProps) {
  return (
    <div role="alert" className="rounded-xl bg-card text-card-foreground">
      <Empty className="rounded-xl border-0 px-6 py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="text-destructive">
            <WarningCircleIcon aria-hidden />
          </EmptyMedia>
          <EmptyTitle className="mt-2">Tagihan gagal dimuat</EmptyTitle>
          <EmptyDescription>
            Server KosBagi tidak merespons. Periksa koneksi, lalu muat ulang.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={retrying}
            aria-busy={retrying}
            onClick={onRetry}
          >
            <ArrowsClockwiseIcon
              aria-hidden
              data-icon="inline-start"
              className={retrying ? "animate-spin" : undefined}
            />
            Muat ulang
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
