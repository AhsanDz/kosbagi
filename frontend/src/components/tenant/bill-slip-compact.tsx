import { BillSlipActions } from "@/components/tenant/bill-slip-actions";
import { BillSummary } from "@/components/tenant/bill-summary";
import { RecordedStamp } from "@/components/tenant/recorded-stamp";
import type { BillDto } from "@/lib/api/types";
import type { BillViewState } from "@/lib/billing";
import { cn } from "@/lib/utils";

/** Garis sobek tegak dengan takik di tepi atas dan bawah. */
function VerticalTearLine() {
  return (
    <div aria-hidden className="relative w-0.5 self-stretch text-border">
      <div className="dash-line-y h-full w-[1.5px]" />
      <span className="absolute -top-2 -left-[7px] size-4 rounded-full bg-background" />
      <span className="absolute -bottom-2 -left-[7px] size-4 rounded-full bg-background" />
    </div>
  );
}

interface BillSlipCompactProps {
  bill: BillDto;
  state: BillViewState;
  className?: string;
}

/**
 * Slip ringkas (Figma: "Slip ringkas"): versi mendatar untuk /penghuni. Di
 * bawah 1024 px halaman memakai Slip tagihan tegak.
 */
export function BillSlipCompact({ bill, state, className }: BillSlipCompactProps) {
  return (
    <article className={cn("relative flex rounded-xl bg-card text-card-foreground", className)}>
      <div className="relative min-w-0 flex-1 px-8 py-7">
        <BillSummary bill={bill} state={state} />
        {state === "PAID_RECORDED" ? (
          <RecordedStamp className="absolute top-3 right-3 xl:top-[49px]" />
        ) : null}
      </div>

      <VerticalTearLine />

      <div className="flex w-[300px] shrink-0 flex-col justify-center gap-3 px-6 py-7 xl:w-[380px] xl:px-8">
        <BillSlipActions bill={bill} state={state} />
      </div>
    </article>
  );
}
