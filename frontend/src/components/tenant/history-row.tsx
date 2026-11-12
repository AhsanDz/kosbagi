import { ChainStatus } from "@/components/common/chain-status";
import { TableCell, TableRow } from "@/components/ui/table";
import type { BillDto } from "@/lib/api/types";
import { chainTxStatus } from "@/lib/billing";
import { formatDate, formatPeriod, formatRupiah } from "@/lib/format";

function BillChainStatus({ chain }: { chain: BillDto["chain"] }) {
  return (
    <ChainStatus
      status={chain ? chainTxStatus[chain.status] : "QUEUED"}
      txHash={chain?.txHash ?? undefined}
    />
  );
}

/**
 * Baris riwayat versi Desktop (Figma: "Baris riwayat", Ukuran=Desktop).
 * Kolom Aksi menyusul di progress 3 bersama halaman kuitansi.
 */
export function HistoryTableRow({ bill }: { bill: BillDto }) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">{formatPeriod(bill.period)}</TableCell>
      <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">
        {formatRupiah(bill.amountIdr)}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {bill.paidAt ? formatDate(bill.paidAt) : null}
      </TableCell>
      <TableCell>
        <BillChainStatus chain={bill.chain} />
      </TableCell>
    </TableRow>
  );
}

/**
 * Baris riwayat versi Ponsel (Figma: "Baris riwayat", Ukuran=Ponsel). Panah ke
 * kanan menyusul di progress 3, saat baris ini bisa membuka kuitansi.
 */
export function HistoryListItem({ bill }: { bill: BillDto }) {
  return (
    <li className="flex flex-col gap-1.5 border-t border-border px-4 py-3.5">
      <div className="flex items-start justify-between gap-2 text-sm leading-5 text-card-foreground">
        <span className="font-semibold">{formatPeriod(bill.period)}</span>
        <span className="font-medium tabular-nums">{formatRupiah(bill.amountIdr)}</span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <BillChainStatus chain={bill.chain} />
        <span className="text-xs leading-4 text-muted-foreground">
          {bill.paidAt ? formatDate(bill.paidAt) : null}
        </span>
      </div>
    </li>
  );
}
