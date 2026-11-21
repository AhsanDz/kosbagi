import { CheckIcon, XIcon } from "@phosphor-icons/react/ssr";

import type { KycViewState } from "@/lib/kyc";
import { cn } from "@/lib/utils";

type StepState = "done" | "active" | "upcoming" | "success" | "rejected";

interface Step {
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    title: "Ajukan data dummy",
    description: "Nama lengkap dan nomor identitas berawalan DUMMY-.",
  },
  {
    title: "Admin meninjau",
    description: "Biasanya satu hari kerja. Saat demo, admin menyetujui langsung.",
  },
  {
    title: "Dompet kustodian dibuat",
    description: "KosBagi membuat dompet untukmu. Kamu tidak perlu memegang ETH.",
  },
  {
    title: "Tercatat lolos KYC di KosToken",
    description: "Fungsi setKycStatus mencatat alamat dompetmu di Sepolia.",
  },
];

const REJECTED_STEP: Step = {
  title: "Pengajuan ditolak",
  description: "Perbaiki data sesuai alasan dari admin, lalu ajukan lagi.",
};

/** Keadaan halaman ke keadaan tiap tahap (Figma: varian Tahap di "Jejak KYC"). */
function stepStates(state: KycViewState): StepState[] {
  switch (state) {
    case "SUBMITTED":
      return ["done", "active", "upcoming", "upcoming"];
    case "REJECTED":
      return ["done", "rejected", "upcoming", "upcoming"];
    case "REGISTERING":
    case "WALLET_FAILED":
      return ["done", "done", "done", "active"];
    case "RECORDED":
      return ["done", "done", "done", "success"];
    default:
      return ["active", "upcoming", "upcoming", "upcoming"];
  }
}

function StepDot({ state }: { state: StepState }) {
  const base = "flex size-[22px] shrink-0 items-center justify-center rounded-full";
  switch (state) {
    case "done":
      return (
        <span className={cn(base, "bg-primary text-primary-foreground")}>
          <CheckIcon aria-hidden className="size-3" />
        </span>
      );
    case "success":
      return (
        <span className={cn(base, "bg-success text-success-foreground")}>
          <CheckIcon aria-hidden className="size-3" />
        </span>
      );
    case "rejected":
      return (
        <span className={cn(base, "bg-destructive text-destructive-foreground")}>
          <XIcon aria-hidden className="size-3" />
        </span>
      );
    case "active":
      return (
        <span className={cn(base, "border-2 border-primary bg-card")}>
          <span className="size-2 rounded-full bg-primary" />
        </span>
      );
    default:
      // Garis muted-foreground supaya kontrasnya di atas 3:1 di kedua mode (catatan QA P2).
      return <span className={cn(base, "border-[1.5px] border-muted-foreground bg-card")} />;
  }
}

const stateLabel: Record<StepState, string> = {
  done: "selesai",
  active: "sedang berjalan",
  upcoming: "belum",
  success: "selesai",
  rejected: "ditolak",
};

/**
 * Jejak KYC (Figma: "Jejak KYC"): empat tahap dari pengajuan sampai alamat
 * dompet tercatat lolos KYC di KosToken. Tahap selesai berwarna tinta; hanya
 * tahap Tercatat yang lime. Saat ditolak, tahap kedua menjadi Pengajuan ditolak.
 */
export function KycTrail({ state, className }: { state: KycViewState; className?: string }) {
  const states = stepStates(state);

  return (
    <section
      aria-labelledby="judul-jejak-kyc"
      className={cn("flex flex-col gap-5 rounded-xl bg-card px-7 py-6 text-card-foreground", className)}
    >
      <div className="flex flex-col gap-1">
        <h2 id="judul-jejak-kyc" className="text-h5 font-semibold">
          Setelah kamu mengajukan
        </h2>
        <p className="text-sm leading-5 text-muted-foreground">
          Data identitas tetap di database KosBagi. Yang dicatat on-chain hanya alamat dompet dan
          status lolos KYC.
        </p>
      </div>

      <ol className="flex flex-col">
        {STEPS.map((baseStep, index) => {
          const stepState = states[index];
          const step = stepState === "rejected" ? REJECTED_STEP : baseStep;
          const last = index === STEPS.length - 1;
          const nextReached = !last && states[index + 1] !== "upcoming";

          return (
            <li
              key={baseStep.title}
              aria-current={stepState === "active" ? "step" : undefined}
              className="flex gap-3.5"
            >
              <div aria-hidden className="flex flex-col items-center gap-1 self-stretch">
                <StepDot state={stepState} />
                {last ? null : (
                  <span
                    className={cn("w-0.5 flex-1", nextReached ? "bg-primary" : "bg-border")}
                  />
                )}
              </div>
              <div
                className={cn(
                  "flex min-w-0 flex-1 flex-col gap-0.5 pt-px text-sm leading-5",
                  !last && "pb-5"
                )}
              >
                <p
                  className={cn(
                    "font-semibold",
                    stepState === "upcoming" && "text-muted-foreground",
                    stepState === "rejected" && "text-destructive"
                  )}
                >
                  {step.title}
                  <span className="sr-only">, {stateLabel[stepState]}</span>
                </p>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
