import {
  CheckCircleIcon,
  CircleNotchIcon,
  MinusCircleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { CopyHashButton } from "@/components/common/copy-hash-button";
import { TextLink } from "@/components/common/text-link";
import type { ChainRecordStatus } from "@/lib/api/types";
import { etherscanTxUrl, formatNumber, shortenHash } from "@/lib/format";
import type { HexString } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Bentuk minimum data rantai: dipakai tagihan, whitelist KYC, dan transfer token. */
export interface ChainStackData {
  status: ChainRecordStatus;
  txHash: HexString | null;
  blockNumber?: number | null;
}

interface ChainStatusStackProps {
  chain: ChainStackData | null;
  /** Teks di bawah "Menunggu pencatatan on-chain". Bawaannya untuk tagihan sewa. */
  pendingDescription?: string;
  /** Teks di bawah judul saat gagal. Bawaannya untuk tagihan sewa. */
  failedDescription?: string;
  className?: string;
}

const DEFAULT_PENDING =
  "Transaksi sedang dikirim ke jaringan Sepolia. Biasanya selesai dalam 1 menit.";
const DEFAULT_FAILED = "Jaringan Sepolia tidak merespons. Pembayaranmu tetap lunas di sistem.";

const BOX_CLASS = "flex w-full items-start gap-3 rounded-lg px-4 py-3";

/**
 * Status on-chain ukuran Tumpuk (Figma: "Status on-chain", Ukuran=Tumpuk),
 * dipakai di slip tagihan, Kartu status KYC, Sheet tinjau KYC, dan Tiket beli.
 * Sengaja tanpa tombol Coba lagi: pengulangan pencatatan ada di antrean admin
 * (progress 4).
 */
export function ChainStatusStack({
  chain,
  pendingDescription = DEFAULT_PENDING,
  failedDescription = DEFAULT_FAILED,
  className,
}: ChainStatusStackProps) {
  if (chain?.status === "RECORDED") {
    // txHash bisa null bila catatan sudah ada on-chain tetapi transaksi asalnya
    // tidak ditemukan: tetap Tercatat, hanya tanpa hash dan tautan Etherscan.
    const { txHash, blockNumber } = chain;
    return (
      <div className={cn(BOX_CLASS, "bg-success-muted text-success-muted-foreground", className)}>
        <CheckCircleIcon aria-hidden className="size-5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm leading-5 font-semibold">Tercatat di blockchain</p>
          {txHash || blockNumber != null ? (
            <p className="flex flex-wrap items-center gap-x-1.5 text-xs leading-4">
              {txHash ? (
                <>
                  <span>Tx</span>
                  <span className="font-mono tabular-nums" title={txHash}>
                    {shortenHash(txHash)}
                  </span>
                  <CopyHashButton hash={txHash} />
                </>
              ) : null}
              {blockNumber != null ? (
                <span>
                  {txHash ? "· " : ""}Blok {formatNumber(blockNumber)}
                </span>
              ) : null}
            </p>
          ) : null}
          {txHash ? (
            <TextLink href={etherscanTxUrl(txHash)} external className="self-start">
              Lihat di Etherscan
            </TextLink>
          ) : null}
        </div>
      </div>
    );
  }

  if (chain?.status === "FAILED") {
    return (
      <div
        className={cn(BOX_CLASS, "bg-destructive-muted text-destructive-muted-foreground", className)}
      >
        <WarningCircleIcon aria-hidden className="size-5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm leading-5 font-semibold">Pencatatan on-chain gagal</p>
          <p className="text-xs leading-4">{failedDescription}</p>
        </div>
      </div>
    );
  }

  if (chain?.status === "NOT_RECORDED") {
    return (
      <div className={cn(BOX_CLASS, "bg-muted text-muted-foreground", className)}>
        <MinusCircleIcon aria-hidden className="size-5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm leading-5 font-semibold text-foreground">Tidak dicatat on-chain</p>
          <p className="text-xs leading-4">
            Tagihan ini lunas sebelum KosBagi mencatat sewa di Sepolia.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(BOX_CLASS, "bg-info-muted text-info-muted-foreground", className)}>
      <CircleNotchIcon aria-hidden className="size-5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm leading-5 font-semibold">Menunggu pencatatan on-chain</p>
        <p className="text-xs leading-4">{pendingDescription}</p>
      </div>
    </div>
  );
}
