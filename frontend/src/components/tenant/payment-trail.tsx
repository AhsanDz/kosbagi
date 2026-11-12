import { CheckIcon, XIcon } from "@phosphor-icons/react/ssr";

import type { BillViewState } from "@/lib/billing";
import { formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";

const STEPS = [
  "Bayar di Midtrans",
  "Konfirmasi Midtrans",
  "Tagihan lunas",
  "Tercatat di Sepolia",
] as const;

const LAST_STEP = STEPS.length - 1;

/** Keadaan tagihan ke tahap yang sedang berjalan. -1 berarti belum ada tahap. */
const activeStepByState: Record<BillViewState, number> = {
  UNPAID: -1,
  EXPIRED: -1,
  FAILED: -1,
  PENDING: 0,
  CHECKING: 1,
  PAID_QUEUED: LAST_STEP,
  PAID_RECORDED: LAST_STEP,
  PAID_CHAIN_FAILED: LAST_STEP,
};

function describeState(state: BillViewState, period: string) {
  switch (state) {
    case "PENDING":
      return "Pembayaran sedang berjalan di Midtrans.";
    case "CHECKING":
      return "Pembayaran selesai. Menunggu konfirmasi Midtrans.";
    case "PAID_QUEUED":
      return "Tagihan lunas. Pencatatan ke Sepolia sedang berjalan.";
    case "PAID_RECORDED":
      return "Selesai. Siapa pun bisa memeriksa catatan ini di Etherscan.";
    case "PAID_CHAIN_FAILED":
      return "Tagihan tetap lunas. Operator mengulang pencatatan ke Sepolia.";
    default:
      return `Belum ada pembayaran untuk ${formatPeriod(period)}.`;
  }
}

function StepDot({ index, active, state }: { index: number; active: number; state: BillViewState }) {
  const baseClass = "flex size-[22px] shrink-0 items-center justify-center rounded-full transition-colors duration-300";

  if (index === LAST_STEP && state === "PAID_RECORDED") {
    return (
      <span className={cn(baseClass, "bg-success text-success-foreground")}>
        <CheckIcon aria-hidden className="size-3" />
      </span>
    );
  }
  if (index === LAST_STEP && state === "PAID_CHAIN_FAILED") {
    return (
      <span className={cn(baseClass, "bg-destructive text-destructive-foreground")}>
        <XIcon aria-hidden className="size-3" />
      </span>
    );
  }
  if (index < active) {
    return (
      <span className={cn(baseClass, "bg-primary text-primary-foreground")}>
        <CheckIcon aria-hidden className="size-3" />
      </span>
    );
  }
  if (index === active) {
    return (
      <span className={cn(baseClass, "border-2 border-primary bg-card")}>
        <span className="size-2 rounded-full bg-primary" />
      </span>
    );
  }
  return <span className={cn(baseClass, "border-[1.5px] border-border bg-card")} />;
}

interface PaymentTrailProps {
  period: string;
  state: BillViewState;
  className?: string;
}

/**
 * Jejak pembayaran (Figma: "Jejak pembayaran"): empat tahap dari Midtrans sampai
 * Sepolia. Tahap selesai berwarna tinta dan hanya tahap Tercatat yang lime,
 * sesuai aturan lime untuk bukti. Titik berada di tengah kolom dan label rata
 * tengah, jadi garis dimulai dari titik pertama dan berakhir di titik terakhir.
 */
export function PaymentTrail({ period, state, className }: PaymentTrailProps) {
  const active = activeStepByState[state];

  return (
    <section
      aria-labelledby="judul-jejak"
      className={cn("flex-col gap-4 rounded-xl bg-card px-6 py-5 text-card-foreground", className)}
    >
      <div className="flex flex-col gap-0.5">
        <h2 id="judul-jejak" className="text-h5 font-semibold">
          Jejak pembayaran
        </h2>
        <p className="text-sm leading-5 text-muted-foreground">{describeState(state, period)}</p>
      </div>

      <ol className="flex items-start">
        {STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={index === active ? "step" : undefined}
            className="flex min-w-0 flex-1 flex-col gap-2"
          >
            <div aria-hidden className="flex items-center">
              <span
                className={cn(
                  "h-0.5 min-w-0 flex-1 transition-colors duration-300",
                  index === 0 ? "bg-transparent" : index <= active ? "bg-primary" : "bg-border"
                )}
              />
              <StepDot index={index} active={active} state={state} />
              <span
                className={cn(
                  "h-0.5 min-w-0 flex-1 transition-colors duration-300",
                  index === LAST_STEP ? "bg-transparent" : index < active ? "bg-primary" : "bg-border"
                )}
              />
            </div>
            <p
              className={cn(
                "text-center text-xs leading-4 font-medium",
                index <= active ? "text-card-foreground" : "text-muted-foreground"
              )}
            >
              {label}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
