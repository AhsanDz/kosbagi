import { TrayIcon } from "@phosphor-icons/react/ssr";

import { TextLink } from "@/components/common/text-link";
import { HistoryListItem, HistoryTableRow } from "@/components/tenant/history-row";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BillDto } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface HistoryCardProps {
  bills: BillDto[];
  /** Ringkasan menampilkan tautan ke halaman Tagihan dan membatasi jumlah baris. */
  summary?: boolean;
  className?: string;
}

const SUMMARY_ROW_LIMIT = 4;

/**
 * Kartu riwayat (Figma: "Kartu riwayat"). Bentuknya mengikuti lebar kartu, bukan
 * lebar layar: tabel butuh minimal 560 px, jadi di kolom yang sempit (mis.
 * laptop 1280 px) kartu tetap memakai daftar seperti di ponsel.
 */
export function HistoryCard({ bills, summary = false, className }: HistoryCardProps) {
  const rows = summary ? bills.slice(0, SUMMARY_ROW_LIMIT) : bills;

  if (rows.length === 0) {
    return (
      <section
        aria-label="Riwayat pembayaran"
        className={cn("rounded-xl bg-card text-card-foreground", className)}
      >
        <Empty className="rounded-xl border-0 px-6 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TrayIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle className="mt-2">Belum ada riwayat pembayaran</EmptyTitle>
            <EmptyDescription>Riwayat muncul setelah tagihan pertama lunas.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="judul-riwayat"
      className={cn(
        "@container overflow-hidden rounded-xl bg-card text-card-foreground",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4 px-4 pt-5 pb-3.5 @min-[35rem]:px-6">
        <h2 id="judul-riwayat" className="text-h5 font-semibold">
          Riwayat pembayaran
        </h2>
        {summary ? <TextLink href="/penghuni/tagihan">Semua tagihan</TextLink> : null}
      </div>

      <div className="hidden @min-[35rem]:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[136px]">Periode</TableHead>
              <TableHead className="w-[116px]">Nominal</TableHead>
              <TableHead className="w-[104px]">Dibayar</TableHead>
              <TableHead>On-chain</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((bill) => (
              <HistoryTableRow key={bill.id} bill={bill} />
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="@min-[35rem]:hidden">
        {rows.map((bill) => (
          <HistoryListItem key={bill.id} bill={bill} />
        ))}
      </ul>
    </section>
  );
}
