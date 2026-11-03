import { InfoIcon } from "@phosphor-icons/react/ssr";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  annualProjection,
  projectionHighlights,
  taxSensitivityNote,
} from "@/lib/data/finance";
import { formatSignedNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Tab Keuangan: perkiraan per tahun dari asumsi proposal dan riwayat distribusi. */
export function FinanceTab() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-2">
        <h2 className="text-h3 font-semibold text-foreground">Perkiraan per tahun</h2>
        <p className="max-w-[680px] text-base leading-6 text-muted-foreground">
          Dihitung dari asumsi proposal: 10 kamar, okupansi 90%. Angka dummy, bukan jaminan.
        </p>
      </section>

      <dl className="flex flex-col">
        {annualProjection.map((row) => (
          <div
            key={row.label}
            className={cn(
              "flex items-center justify-between gap-4 py-4",
              row.subtotal ? "border-t-[1.5px] border-foreground" : "border-t border-border"
            )}
          >
            <dt className="flex min-w-0 flex-col gap-0.5">
              <span
                className={cn("text-base leading-6 text-foreground", row.subtotal && "font-medium")}
              >
                {row.label}
              </span>
              {row.note ? (
                <span className="text-xs leading-4 text-muted-foreground">{row.note}</span>
              ) : null}
            </dt>
            <dd className="shrink-0 font-mono text-sm leading-5 text-foreground tabular-nums">
              {formatSignedNumber(row.amountIdr)}
            </dd>
          </div>
        ))}
      </dl>

      <dl className="flex flex-wrap gap-x-14 gap-y-6">
        {projectionHighlights.map((item) => (
          <div key={item.label} className="flex flex-col gap-1">
            <dt className="text-xs leading-4 font-medium text-muted-foreground">{item.label}</dt>
            <dd className="text-number-lg font-semibold text-foreground tabular-nums">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>

      <p className="max-w-[680px] text-sm leading-5 text-muted-foreground">{taxSensitivityNote}</p>

      <section className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold text-foreground">Riwayat distribusi</h2>
        <Alert variant="info">
          <InfoIcon aria-hidden />
          <AlertTitle>Belum ada periode yang ditutup</AlertTitle>
          <AlertDescription>
            Distribusi pertama dicatat lewat closePeriod setelah periode November 2026 ditutup admin.
          </AlertDescription>
        </Alert>
      </section>
    </div>
  );
}
