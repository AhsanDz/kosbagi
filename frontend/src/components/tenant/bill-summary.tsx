import { BillStatusBadge } from "@/components/common/bill-status-badge";
import type { BillDto } from "@/lib/api/types";
import { billBadgeStatus, billCaption, type BillViewState } from "@/lib/billing";
import { formatPeriod, formatRupiah } from "@/lib/format";

/** Status, periode, nominal, dan keterangan: bagian kepala Slip tagihan dan Slip ringkas. */
export function BillSummary({ bill, state }: { bill: BillDto; state: BillViewState }) {
  return (
    <div className="flex flex-col items-start gap-3.5">
      <BillStatusBadge status={billBadgeStatus[state]} />
      <div className="flex w-full flex-col gap-1">
        <h2 className="text-h5 font-semibold">Sewa {formatPeriod(bill.period)}</h2>
        <p className="text-h1 font-semibold whitespace-nowrap tabular-nums md:text-number-hero">
          {formatRupiah(bill.amountIdr)}
        </p>
        <p className="text-sm leading-5 text-muted-foreground">{billCaption(bill, state)}</p>
      </div>
    </div>
  );
}
