import Link from "next/link";
import { TrayIcon } from "@phosphor-icons/react/ssr";

import { BillSlipSkeleton } from "@/components/tenant/billing-states";
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
import { cn } from "@/lib/utils";

const PANEL_ROWS = [
  ["w-[110px]", "w-[140px]"],
  ["w-[130px]", "w-[164px]"],
  ["w-[150px]", "w-[188px]"],
  ["w-[110px]", "w-[212px]"],
  ["w-[130px]", "w-[140px]"],
  ["w-[150px]", "w-[164px]"],
  ["w-[110px]", "w-[188px]"],
  ["w-[130px]", "w-[212px]"],
  ["w-[150px]", "w-[140px]"],
] as const;

/** Kerangka panel gelap (Figma: Kuitansi / Memuat, "Panel memuat"). */
function PanelSkeleton() {
  return (
    <div className="dark flex flex-col gap-3 rounded-xl bg-card px-5 py-7 md:px-8">
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-6 w-55 max-w-full rounded-md" />
        <Skeleton className="h-3.5 w-105 max-w-full" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      {PANEL_ROWS.map(([left, right], index) => (
        <div
          key={`${left}-${right}-${index}`}
          className={cn(
            "flex items-center justify-between gap-4 py-3",
            index > 0 && "border-t border-border"
          )}
        >
          <Skeleton className={`h-3 ${left} max-w-[40%]`} />
          <Skeleton className={`h-3 ${right} max-w-[50%]`} />
        </div>
      ))}
    </div>
  );
}

/** State memuat halaman kuitansi: kerangka slip di kiri, kerangka panel gelap di kanan. */
export function ReceiptSkeleton() {
  return (
    <div aria-busy="true" className="grid items-start gap-4 md:gap-8 xl:grid-cols-[480px_minmax(0,1fr)]">
      <p className="sr-only">Memuat kuitansi.</p>
      <BillSlipSkeleton />
      <PanelSkeleton />
    </div>
  );
}

/** Tagihan tidak ada, milik orang lain, atau belum lunas (Figma: Kuitansi / Tidak ditemukan). */
export function ReceiptNotFound() {
  return (
    <section aria-label="Kuitansi" className="rounded-xl bg-card px-6 py-10 text-card-foreground">
      <Empty className="border-0 p-0 sm:p-0">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TrayIcon aria-hidden />
          </EmptyMedia>
          <EmptyTitle className="mt-2">Kuitansi tidak ditemukan</EmptyTitle>
          <EmptyDescription>
            Kuitansi hanya ada untuk tagihan yang sudah lunas dan milik akunmu. Periksa lagi dari
            halaman Tagihan.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline" size="sm">
            <Link href="/penghuni/tagihan">Kembali ke Tagihan</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </section>
  );
}
