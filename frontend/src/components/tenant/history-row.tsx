import Link from "next/link";
import { CaretRightIcon } from "@phosphor-icons/react/ssr";

import { ChainStatus } from "@/components/common/chain-status";
import { TableCell, TableRow } from "@/components/ui/table";
import type { BillDto } from "@/lib/api/types";
import { chainTxStatus, receiptHref } from "@/lib/billing";
import { formatDate, formatPeriod, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

function BillChainStatus({ chain, className }: { chain: BillDto["chain"]; className?: string }) {
  return (
    <ChainStatus
      status={chain ? chainTxStatus[chain.status] : "QUEUED"}
      txHash={chain?.txHash ?? undefined}
      className={className}
    />
  );
}

/** Jarak antarsel tabel riwayat: 12 px, sel pertama dan terakhir 16 px dari tepi kartu. */
export const HISTORY_CELL_CLASS = "px-3 first:pl-4 last:pr-4";

/** Baris riwayat versi Desktop (Figma: "Baris riwayat", Ukuran=Desktop) dengan kolom Aksi. */
export function HistoryTableRow({ bill }: { bill: BillDto }) {
  const period = formatPeriod(bill.period);

  return (
    <TableRow>
      <TableCell className={HISTORY_CELL_CLASS}>{period}</TableCell>
      <TableCell className={cn(HISTORY_CELL_CLASS, "text-right font-medium tabular-nums")}>
        {formatRupiah(bill.amountIdr)}
      </TableCell>
      <TableCell className={HISTORY_CELL_CLASS}>
        {bill.paidAt ? formatDate(bill.paidAt) : null}
      </TableCell>
      <TableCell className={cn(HISTORY_CELL_CLASS, "py-2 whitespace-normal")}>
        {/* Boleh terlipat bila kartu sempit, supaya kolom Aksi tetap terlihat. */}
        <BillChainStatus chain={bill.chain} className="flex-wrap" />
      </TableCell>
      <TableCell className={HISTORY_CELL_CLASS}>
        <Link
          href={receiptHref(bill.id)}
          className="rounded-sm text-sm leading-5 font-medium text-primary underline-offset-4 hover:underline"
        >
          Kuitansi<span className="sr-only"> {period}</span>
        </Link>
      </TableCell>
    </TableRow>
  );
}

/**
 * Baris riwayat versi Ponsel (Figma: "Baris riwayat", Ukuran=Ponsel). Seluruh
 * baris membuka kuitansi; tautan Etherscan di dalamnya tetap bisa diklik karena
 * tautan kuitansi dipasang sebagai lapisan di belakang isi.
 */
export function HistoryListItem({ bill }: { bill: BillDto }) {
  const period = formatPeriod(bill.period);

  return (
    <li className="relative flex items-center gap-2 border-t border-border px-4 py-3.5 hover:bg-muted/60">
      <Link
        href={receiptHref(bill.id)}
        className="absolute inset-0 rounded-none focus-visible:-outline-offset-2"
      >
        <span className="sr-only">Kuitansi {period}</span>
      </Link>
      <div className="pointer-events-none relative flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2 text-sm leading-5 text-card-foreground">
          <span className="font-semibold">{period}</span>
          <span className="font-medium tabular-nums">{formatRupiah(bill.amountIdr)}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="pointer-events-auto">
            <BillChainStatus chain={bill.chain} />
          </span>
          <span className="text-xs leading-4 text-muted-foreground">
            {bill.paidAt ? formatDate(bill.paidAt) : null}
          </span>
        </div>
      </div>
      <CaretRightIcon aria-hidden className="pointer-events-none relative size-4 shrink-0 text-muted-foreground" />
    </li>
  );
}
