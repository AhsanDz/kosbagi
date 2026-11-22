import { SectionHeading } from "@/components/public/section-heading";
import { monthlyWaterfall, type WaterfallStep } from "@/lib/data/finance";
import { formatNumber, formatRupiah, formatSignedNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Tinggi area batang grafik desktop (px), sama dengan Figma. */
const BAR_AREA = 300;
/** Ruang di atas batang untuk label nilai (px). */
const LABEL_SPACE = 30;

interface PlacedStep extends WaterfallStep {
  /** Posisi batang dari atas area batang (px). */
  top: number;
  height: number;
  /** Level setelah langkah ini, untuk garis penghubung ke langkah berikutnya (px). */
  levelAfter: number;
  /** Posisi untuk versi ponsel (persen dari sewa kotor). */
  rightPercent: number;
  widthPercent: number;
}

/**
 * Menghitung posisi tiap batang air terjun dari nominalnya:
 * sewa kotor = batang penuh, setiap pengurang menggantung dari level sebelumnya,
 * hasil akhir berdiri dari dasar sampai level terakhir.
 */
function placeSteps(steps: WaterfallStep[]): PlacedStep[] {
  const gross = steps[0]?.amountIdr ?? 1;
  let level = 0;
  let deducted = 0;

  return steps.map((step) => {
    const height = (Math.abs(step.amountIdr) / gross) * BAR_AREA;
    const widthPercent = (Math.abs(step.amountIdr) / gross) * 100;

    if (step.kind === "total") {
      return { ...step, top: 0, height, levelAfter: 0, rightPercent: 0, widthPercent: 100 };
    }
    if (step.kind === "deduction") {
      const placed = { ...step, top: level, height, levelAfter: level + height, rightPercent: deducted, widthPercent };
      level += height;
      deducted += widthPercent;
      return placed;
    }
    return { ...step, top: level, height: BAR_AREA - level, levelAfter: level, rightPercent: 0, widthPercent };
  });
}

function barClass(kind: WaterfallStep["kind"]) {
  if (kind === "total") return "bg-foreground";
  if (kind === "result") return "bg-success";
  return "border-[1.5px] border-dashed border-muted-foreground";
}

/** Grafik air terjun vertikal untuk layar md ke atas. */
function DesktopWaterfall({ steps }: { steps: PlacedStep[] }) {
  return (
    <ol className="grid w-full max-w-[920px] grid-cols-5 gap-10">
      {steps.map((step, index) => (
        <li key={step.label} className="flex min-w-0 flex-col">
          <div className="relative" style={{ height: LABEL_SPACE + BAR_AREA }}>
            <span
              className={cn(
                "absolute left-0 font-mono text-sm leading-5 whitespace-nowrap tabular-nums",
                step.kind === "result" ? "text-success" : "text-foreground"
              )}
              style={{ top: LABEL_SPACE + step.top - 28 }}
            >
              {formatSignedNumber(step.amountIdr)}
            </span>
            <div
              aria-hidden
              className={cn("absolute inset-x-0 rounded-md", barClass(step.kind))}
              style={{ top: LABEL_SPACE + step.top, height: step.height }}
            />
            {index < steps.length - 1 ? (
              <div
                aria-hidden
                className="dash-line absolute left-full h-px w-10 text-muted-foreground"
                style={{ top: LABEL_SPACE + step.levelAfter }}
              />
            ) : null}
          </div>
          <span className="mt-4 text-sm leading-5 text-muted-foreground">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}

/** Versi ponsel: batang horizontal, pengurang ditempatkan dari kanan. */
function MobileWaterfall({ steps }: { steps: PlacedStep[] }) {
  return (
    <ol className="flex w-full flex-col gap-4">
      {steps.map((step) => (
        <li key={step.label} className="flex flex-col gap-1.5">
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm leading-5 text-muted-foreground">{step.shortLabel}</span>
            <span
              className={cn(
                "font-mono text-xs leading-4 tabular-nums",
                step.kind === "result" ? "text-success" : "text-foreground"
              )}
            >
              {formatSignedNumber(step.amountIdr)}
            </span>
          </div>
          <div aria-hidden className="relative h-3.5 w-full">
            <div
              className={cn("absolute top-0 h-3.5 rounded-[7px]", barClass(step.kind))}
              style={
                step.kind === "deduction"
                  ? { right: `${step.rightPercent}%`, width: `${step.widthPercent}%` }
                  : { left: 0, width: `${step.widthPercent}%` }
              }
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Bagian gelap "Dari sewa ke bagi hasil." Satu-satunya bagian beranda yang
 * selalu gelap (class "dark"), memperlihatkan sewa kotor dipotong biaya, fee,
 * dan pajak sampai menjadi bagi hasil per token.
 */
export function RentToPayout() {
  const { steps, totalTokens, payoutPerTokenLabel } = monthlyWaterfall;
  const placed = placeSteps(steps);

  return (
    <section aria-labelledby="judul-bagi-hasil" className="dark bg-background text-foreground">
      <div className="container-page flex flex-col gap-5 py-16 lg:gap-6 lg:py-28">
        <SectionHeading id="judul-bagi-hasil">Dari sewa ke bagi hasil.</SectionHeading>
        <p className="max-w-[640px] text-sm leading-5 text-muted-foreground md:text-lg md:leading-7">
          Perkiraan periode November 2026 bila 9 kamar terisi membayar penuh, dihitung dengan asumsi proposal.
          Angka dummy.
        </p>

        <figure className="flex flex-col gap-4 pt-2 md:gap-12 md:pt-0 xl:flex-row xl:items-start">
          <figcaption className="sr-only">
            Sewa kotor {formatRupiah(steps[0]?.amountIdr ?? 0)} dikurangi biaya operasional, fee
            pengelolaan, dan PPh badan menjadi {formatRupiah(steps.at(-1)?.amountIdr ?? 0)} yang
            dibagikan, atau {payoutPerTokenLabel} per token per bulan.
          </figcaption>
          <div className="hidden w-full md:block">
            <DesktopWaterfall steps={placed} />
          </div>
          <div className="md:hidden">
            <MobileWaterfall steps={placed} />
          </div>

          <div className="flex flex-col items-start gap-1 pt-2 md:pt-0 xl:mt-[150px] xl:w-[320px] xl:shrink-0">
            <span className="hidden text-sm leading-5 text-muted-foreground md:block">
              ÷ {formatNumber(totalTokens)} token
            </span>
            <span className="font-display text-display-section font-black whitespace-nowrap text-success">
              {payoutPerTokenLabel}
            </span>
            <span className="text-sm leading-5 text-muted-foreground md:w-[220px]">
              per token per bulan, dicatat permanen lewat closePeriod
            </span>
          </div>
        </figure>
      </div>
    </section>
  );
}
