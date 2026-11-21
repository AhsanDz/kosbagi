import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  MinusCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { etherscanTxUrl, shortenHash } from "@/lib/format";
import type { ChainTxStatus, HexString } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ChainStatusProps {
  status: ChainTxStatus;
  txHash?: HexString;
  className?: string;
}

/**
 * Status on-chain versi ringkas (Figma: "Status on-chain", Ukuran=Ringkas),
 * dipakai di sel tabel dan daftar dokumen. Tiga keadaan yang selalu jelas:
 * - QUEUED/SENT  -> "Menunggu pencatatan"
 * - CONFIRMED    -> "Tercatat" + hash yang menaut ke Etherscan
 * - FAILED       -> "Gagal dicatat"
 * - NOT_RECORDED -> "Data lampau", tanpa tautan (lunas sebelum pencatatan on-chain ada)
 * Warna selalu disertai ikon dan teks, tidak hanya warna.
 */
export function ChainStatus({ status, txHash, className }: ChainStatusProps) {
  if (status === "CONFIRMED") {
    // Catatan bisa sudah ada on-chain walau transaksi asalnya tidak ditemukan
    // (txHash null): tetap Tercatat, hanya tanpa tautan Etherscan.
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs leading-4", className)}>
        <CheckCircleIcon aria-hidden className="size-3.5 shrink-0 text-success-muted-foreground" />
        <span className="font-medium text-success-muted-foreground">Tercatat</span>
        {txHash ? (
          <a
            href={etherscanTxUrl(txHash)}
            target="_blank"
            rel="noopener noreferrer"
            title={txHash}
            className="inline-flex items-center gap-1 rounded-sm font-mono text-primary tabular-nums underline-offset-2 hover:underline"
          >
            <span className="sr-only">Lihat transaksi di Etherscan: </span>
            {shortenHash(txHash)}
            <ArrowSquareOutIcon aria-hidden className="size-3 shrink-0" />
          </a>
        ) : null}
      </span>
    );
  }

  if (status === "NOT_RECORDED") {
    return (
      <span
        title="Lunas sebelum pencatatan on-chain dimulai, jadi tidak ada di Sepolia."
        className={cn(
          "inline-flex items-center gap-1 text-xs leading-4 text-muted-foreground",
          className
        )}
      >
        <MinusCircleIcon aria-hidden className="size-3.5 shrink-0" />
        <span className="font-medium">Data lampau</span>
        <span className="sr-only">, lunas sebelum pencatatan on-chain dan tidak ada di Sepolia</span>
      </span>
    );
  }

  if (status === "FAILED") {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs leading-4 text-destructive", className)}>
        <WarningCircleIcon aria-hidden className="size-3.5 shrink-0" />
        <span className="font-medium">Gagal dicatat</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs leading-4 text-info-muted-foreground",
        className
      )}
    >
      <CircleNotchIcon aria-hidden className="size-3.5 shrink-0" />
      <span className="font-medium">Menunggu pencatatan</span>
    </span>
  );
}
