import { ChainStatus } from "@/components/common/chain-status";
import { StackedListHead, StackedListItem, StackedListMeta } from "@/components/common/stacked-list";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { receiptFileUrl } from "@/lib/api/expenses";
import type { ExpenseDto, StaffChainStatus } from "@/lib/api/types";
import { formatDate, formatRupiah, shortenHash } from "@/lib/format";
import type { ChainTxStatus } from "@/lib/types";

/** Pengelola dan admin melihat status sebenarnya, termasuk Gagal dicatat. */
export const staffChainStatus: Record<StaffChainStatus, ChainTxStatus> = {
  PENDING: "QUEUED",
  RECORDED: "CONFIRMED",
  FAILED: "FAILED",
};

function HeadRow() {
  return (
    <TableHeader>
      <TableRow className="border-0">
        <TableHead className="w-[130px]">Tanggal</TableHead>
        <TableHead className="w-[170px]">Kategori</TableHead>
        <TableHead className="w-[290px]">Keterangan</TableHead>
        <TableHead className="w-[150px] text-right">Nominal</TableHead>
        <TableHead className="w-[170px]">Hash nota</TableHead>
        <TableHead className="w-[210px]">Status on-chain</TableHead>
      </TableRow>
    </TableHeader>
  );
}

/** Kerangka tabel biaya (Figma: Pengelola / Biaya / Memuat). */
export function ExpenseTableSkeleton() {
  return (
    <div className="flex flex-col rounded-xl bg-card px-2.5 py-3">
      {[1, 2, 3, 4, 5].map((row) => (
        <div key={row} className="flex gap-4 border-b border-border px-2.5 py-3.5 xl:w-[60%]">
          <Skeleton className="h-2.5 w-31" />
          <Skeleton className="h-2.5 w-14" />
          <Skeleton className="h-2.5 w-17" />
          <Skeleton className="h-2.5 w-22" />
        </div>
      ))}
    </div>
  );
}

/** Hash nota yang disingkat 6+4 dan membuka file notanya. */
function ReceiptLink({ expense }: { expense: ExpenseDto }) {
  return (
    <a
      href={receiptFileUrl(expense.id)}
      target="_blank"
      rel="noopener noreferrer"
      title={expense.receiptHash}
      className="rounded-sm font-mono underline-offset-2 hover:underline"
    >
      <span className="sr-only">Buka file nota {expense.fileName}, hash </span>
      {shortenHash(expense.receiptHash)}
    </a>
  );
}

function ExpenseChain({ expense, className }: { expense: ExpenseDto; className?: string }) {
  return (
    <ChainStatus
      status={staffChainStatus[expense.chain.status]}
      txHash={expense.chain.txHash ?? undefined}
      className={className}
    />
  );
}

/**
 * Tabel biaya (Figma: "Baris biaya"). Hash nota disingkat 6+4 dan membuka file
 * nota; status on-chain versi ringkas menaut ke transaksi recordExpense.
 * Tabelnya 900 px, jadi dipakai bila kartu minimal selebar itu; di ponsel dan
 * laptop sempit tiap biaya menjadi butir daftar (P5) supaya nominal dan
 * statusnya tidak tersembunyi di luar layar.
 */
export function ExpenseTable({ expenses }: { expenses: ExpenseDto[] }) {
  return (
    <div className="@container overflow-hidden rounded-xl bg-card text-card-foreground">
      <div className="hidden @min-[56.25rem]:block">
        <Table className="min-w-[900px] table-fixed">
          <HeadRow />
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id} className="h-[60px]">
                <TableCell>{formatDate(expense.receiptDate)}</TableCell>
                <TableCell className="truncate font-medium">{expense.category.label}</TableCell>
                <TableCell className="truncate text-muted-foreground" title={expense.description}>
                  {expense.description}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {formatRupiah(expense.amountIdr)}
                </TableCell>
                <TableCell>
                  <ReceiptLink expense={expense} />
                </TableCell>
                <TableCell
                  title={expense.chain.status === "FAILED" ? (expense.chain.lastError ?? undefined) : undefined}
                >
                  <ExpenseChain expense={expense} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="@min-[56.25rem]:hidden" aria-label="Baris biaya">
        {expenses.map((expense) => (
          <StackedListItem key={expense.id}>
            <StackedListHead title={expense.category.label} value={formatRupiah(expense.amountIdr)} />
            <StackedListMeta className="break-words">
              {formatDate(expense.receiptDate)}, {expense.description}
            </StackedListMeta>
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <ExpenseChain expense={expense} className="flex-wrap" />
              <span className="text-xs leading-4 text-muted-foreground">
                Nota <ReceiptLink expense={expense} />
              </span>
            </div>
          </StackedListItem>
        ))}
      </ul>
    </div>
  );
}
