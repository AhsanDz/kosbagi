import { BillSlipActions } from "@/components/tenant/bill-slip-actions";
import { BillSummary } from "@/components/tenant/bill-summary";
import { RecordedStamp } from "@/components/tenant/recorded-stamp";
import type { BillDto, TenantRoomDto } from "@/lib/api/types";
import { billNumber, type BillViewState } from "@/lib/billing";
import { formatPeriodRange, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

interface BillSlipProps {
  bill: BillDto;
  room: TenantRoomDto | null;
  state: BillViewState;
  className?: string;
}

/** Garis sobek dengan dua takik berwarna latar halaman, seperti kuitansi disobek. */
function TearLine() {
  return (
    <div aria-hidden className="relative h-0.5 text-border">
      <div className="dash-line h-[1.5px]" />
      <span className="absolute -top-[7px] -left-2 size-4 rounded-full bg-background" />
      <span className="absolute -top-[7px] -right-2 size-4 rounded-full bg-background" />
    </div>
  );
}

/**
 * Slip tagihan (Figma: "Slip tagihan"): tagihan bulan berjalan sebagai kuitansi
 * tegak. Lebar 440 px di desktop, memenuhi layar di ponsel dengan padding
 * samping 20 px dan nominal Judul/H1.
 */
export function BillSlip({ bill, room, state, className }: BillSlipProps) {
  const number = billNumber(bill, room);

  return (
    <article
      className={cn("relative flex w-full flex-col rounded-xl bg-card text-card-foreground", className)}
    >
      <div className="px-5 pt-6 pb-5 md:px-7">
        <BillSummary bill={bill} state={state} />
      </div>

      <TearLine />

      <dl className="flex flex-col gap-2.5 p-5 text-sm leading-5 md:px-7">
        {room ? (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-muted-foreground">Kamar</dt>
            <dd className="font-semibold">{room.number}</dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Periode</dt>
          <dd>{formatPeriodRange(bill.period)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Biaya tambahan</dt>
          <dd>{formatRupiah(0)}</dd>
        </div>
        {number ? (
          <div className="flex items-center justify-between gap-4">
            <dt className="shrink-0 text-muted-foreground">Nomor tagihan</dt>
            <dd className="min-w-0 font-mono break-all">{number}</dd>
          </div>
        ) : null}
      </dl>

      <div className="flex flex-col gap-3 px-5 pb-7 md:px-7">
        <BillSlipActions bill={bill} state={state} />
      </div>

      {state === "PAID_RECORDED" ? <RecordedStamp className="absolute -top-[7px] -right-1" /> : null}
    </article>
  );
}
