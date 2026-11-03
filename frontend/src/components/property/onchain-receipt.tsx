import type { ReactNode } from "react";

import { HashLink } from "@/components/common/hash-link";
import { featuredReceipt } from "@/lib/data/transactions";
import { formatNumber, shortenHash } from "@/lib/format";
import { cn } from "@/lib/utils";

function ReceiptRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm leading-5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right text-card-foreground">{children}</dd>
    </div>
  );
}

/**
 * Kuitansi on-chain (Figma: beranda, "Kuitansi on-chain"): isi pemanggilan
 * KosLedger.recordRent untuk kamar K03, dengan cap TERCATAT miring.
 * Bagian bawah menegaskan data pribadi tidak pernah dicatat on-chain.
 */
export function OnchainReceipt({ className }: { className?: string }) {
  const receipt = featuredReceipt;

  return (
    <div className={cn("relative w-full max-w-[516px]", className)}>
      <article className="overflow-hidden rounded-xl bg-card text-card-foreground">
        <header className="flex flex-col gap-1 px-4 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5">
          <h3 className="text-h5 font-semibold">
            Kuitansi on-chain, kamar {receipt.room}
            <span className="sr-only"> (status: tercatat di blockchain)</span>
          </h3>
          <p className="font-mono text-xs leading-4 text-muted-foreground">{receipt.contractCall}</p>
        </header>

        {/* Garis sobek: putus-putus 6/6 px dengan warna --border. */}
        <div aria-hidden className="dash-line h-[1.5px] text-border" />

        <div className="flex flex-col gap-3 px-4 pt-5 pb-6 sm:px-6">
          <dl className="flex flex-col gap-3">
            <ReceiptRow label="Properti">
              <span className="font-mono">{receipt.propertyCode}</span>
            </ReceiptRow>
            <ReceiptRow label="Kamar">
              <span className="font-semibold">{receipt.room}</span>
            </ReceiptRow>
            <ReceiptRow label="Periode">
              <span className="font-mono">{receipt.period}</span>
            </ReceiptRow>
            <ReceiptRow label="Nominal">
              <span className="font-mono tabular-nums">{formatNumber(receipt.amountIdr)}</span>
            </ReceiptRow>
            <ReceiptRow label="Referensi">
              <span className="font-mono" title={receipt.reference}>
                {shortenHash(receipt.reference)}
              </span>
            </ReceiptRow>
            <ReceiptRow label="Tx hash">
              <HashLink hash={receipt.txHash} label={`Transaksi sewa ${receipt.room}`} />
            </ReceiptRow>
            <ReceiptRow label="Blok">
              <span className="font-mono tabular-nums">{formatNumber(receipt.blockNumber)}</span>
            </ReceiptRow>
          </dl>
          <p className="text-xs leading-4 text-muted-foreground">
            Referensi = keccak256 dari order_id{" "}
            <span className="font-mono">{receipt.orderId}</span>. Kontrak menolak referensi yang sama
            dicatat dua kali.
          </p>
        </div>

        <footer className="flex flex-col gap-1 bg-muted px-4 pt-4 pb-5 text-xs leading-4 sm:px-6">
          <p className="font-medium text-foreground">Tidak pernah dicatat on-chain</p>
          <p className="text-muted-foreground">
            Nama penghuni dan investor, nomor identitas, rekening, dan file nota. Semua tetap di
            server KosBagi.
          </p>
        </footer>
      </article>

      <p
        aria-hidden
        className="absolute -top-8 -right-2 rotate-[-8deg] rounded-[10px] bg-success px-3.5 py-2 font-display text-[22px] leading-[22px] font-black tracking-[-0.02em] text-success-foreground uppercase sm:-top-12 sm:-right-6 sm:rounded-md sm:px-[18px] sm:py-2.5 sm:text-display-section-mobile"
      >
        Tercatat
      </p>
    </div>
  );
}
