import type { ReactNode } from "react";

import { TearLine } from "@/components/common/tear-line";
import { RecordedStamp } from "@/components/tenant/recorded-stamp";
import type { PeriodPayload } from "@/lib/api/types";
import { kosSumbersari01 } from "@/lib/data/properties";
import { formatDeduction, formatNumber, formatPeriod, formatRupiah, formatSen } from "@/lib/format";
import { cn } from "@/lib/utils";

function ReceiptLine({
  label,
  caption,
  value,
  strong = false,
}: {
  label: string;
  caption: string;
  value: ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className={cn("font-medium", strong ? "text-base leading-6" : "text-sm leading-5")}>{label}</p>
        <p className="text-xs leading-4 text-muted-foreground">{caption}</p>
      </div>
      <p
        className={cn(
          "shrink-0 text-right whitespace-nowrap tabular-nums",
          strong ? "text-number-md font-semibold" : "text-base leading-6 font-medium"
        )}
      >
        {value}
      </p>
    </div>
  );
}

interface ClosingReceiptProps {
  payload: PeriodPayload;
  /** Semua syarat penutupan terpenuhi: struk tidak lagi sementara. */
  ready: boolean;
  className?: string;
}

/**
 * Struk penutupan 560 px (Figma: "Struk penutupan"). Urutannya sama dengan
 * KosLedger.closePeriod: sewa kotor, biaya dari nota, fee 5% dari sewa kotor,
 * PPh 22% dari laba, sewa bersih dibagi total suplai di blok snapshot, nilai
 * per token dibulatkan ke bawah per sen. Sebelum siap, struk berlabel "Struk
 * sementara" dan memakai angka yang sudah tercatat saja. Setelah tercatat,
 * angkanya dari KosLedger.periods dan diberi cap TERCATAT.
 */
export function ClosingReceipt({ payload, ready, className }: ClosingReceiptProps) {
  const { receipt } = payload;
  const closed = payload.status === "CLOSED" || payload.status === "DISTRIBUTED";
  const final = closed || ready;
  const expenseTotal =
    receipt.expensesRecorded +
    (payload.requirements.find((item) => item.key === "EXPENSE_UNRECORDED")?.count ?? 0);

  const rentCaption = final
    ? `${receipt.roomsRecorded} pembayaran sewa tercatat di Sepolia`
    : `${receipt.roomsRecorded} dari ${receipt.roomsTotal} pembayaran sewa tercatat`;
  const expenseCaption =
    expenseTotal === 0
      ? "belum ada nota"
      : final
        ? `${receipt.expensesRecorded} nota tercatat di KosLedger`
        : `${receipt.expensesRecorded} dari ${expenseTotal} nota tercatat`;
  const valueCaption = closed
    ? `disimpan on-chain sebagai ${receipt.valuePerTokenSen} sen`
    : ready
      ? `akan disimpan on-chain sebagai ${receipt.valuePerTokenSen} sen`
      : "angka sementara, belum dicatat on-chain";

  return (
    <section
      aria-labelledby="judul-struk"
      className={cn("relative flex w-full flex-col rounded-xl bg-card text-card-foreground", className)}
    >
      <div className="flex flex-col gap-1.5 px-6 pt-7 pb-6 md:px-8">
        <p className="text-sm leading-5 font-medium text-muted-foreground">
          {final ? "Struk penutupan" : "Struk sementara"}
        </p>
        <h2 id="judul-struk" className="text-h3 font-semibold md:text-h2">
          {formatPeriod(payload.period)}
        </h2>
        <p className="text-sm leading-5 text-muted-foreground">
          {kosSumbersari01.name}, periode {payload.period}, {formatNumber(receipt.totalSupply)} token{" "}
          {kosSumbersari01.tokenSymbol}
        </p>
      </div>
      {closed ? <RecordedStamp rotated={false} className="absolute top-[22px] right-3" /> : null}

      <TearLine />

      <div className="flex flex-col gap-3.5 px-6 py-[22px] md:px-8">
        <ReceiptLine label="Sewa kotor" caption={rentCaption} value={formatRupiah(receipt.grossRentIdr)} />
        <ReceiptLine label="Biaya dari nota" caption={expenseCaption} value={formatDeduction(receipt.expensesIdr)} />
        <ReceiptLine label="Fee pengelolaan 5%" caption="dari sewa kotor" value={formatDeduction(receipt.platformFeeIdr)} />
        <ReceiptLine
          label="PPh badan 22%"
          caption={`dari laba ${formatRupiah(receipt.taxableProfitIdr)} setelah fee dan biaya`}
          value={formatDeduction(receipt.taxIdr)}
        />
      </div>

      <TearLine />

      <div className="flex flex-col gap-3.5 px-6 pt-[22px] pb-[26px] md:px-8">
        <ReceiptLine
          strong
          label="Sewa bersih"
          caption="dibagikan ke pemegang token"
          value={formatRupiah(receipt.netRentIdr)}
        />
        <ReceiptLine
          label="Total suplai di blok snapshot"
          caption="saldo dibaca dari blok sebelum transaksi penutupan"
          value={`${formatNumber(receipt.totalSupply)} token`}
        />
        <div className="flex flex-col gap-0.5 border-t border-border pt-2.5">
          <p className="text-sm leading-5 font-medium text-muted-foreground">Nilai per token</p>
          <p className="text-number-lg font-semibold tabular-nums md:text-number-hero">
            {formatSen(receipt.valuePerTokenSen)}
          </p>
          <p className="font-mono text-xs leading-4 text-muted-foreground">{valueCaption}</p>
        </div>
      </div>

      <p className="rounded-b-xl bg-muted px-6 pt-3.5 pb-[18px] text-xs leading-4 text-muted-foreground md:px-8">
        {final
          ? "Kontrak menghitung ulang angka ini saat closePeriod dan membulatkan ke bawah. Defisit tidak dibawa ke periode berikutnya."
          : "Angka ini berubah setiap ada sewa atau nota yang tercatat. Angka final dihitung kontrak saat closePeriod."}
      </p>
    </section>
  );
}
