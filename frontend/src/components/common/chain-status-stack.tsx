import {
  CheckCircleIcon,
  CircleNotchIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/ssr";

import { CopyHashButton } from "@/components/common/copy-hash-button";
import { TextLink } from "@/components/common/text-link";
import type { ChainRecordDto } from "@/lib/api/types";
import { etherscanTxUrl, formatNumber, shortenHash } from "@/lib/format";

/**
 * Status on-chain ukuran Tumpuk (Figma: "Status on-chain", Ukuran=Tumpuk),
 * dipakai di slip tagihan. Sengaja tanpa tombol Coba lagi: pembayaran penghuni
 * tetap lunas dan pengulangan pencatatan ada di antrean admin (progress 4).
 */
export function ChainStatusStack({ chain }: { chain: ChainRecordDto | null }) {
  if (chain?.status === "RECORDED" && chain.txHash) {
    return (
      <div className="flex w-full items-start gap-3 rounded-lg bg-success-muted px-4 py-3 text-success-muted-foreground">
        <CheckCircleIcon aria-hidden className="size-5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm leading-5 font-semibold">Tercatat di blockchain</p>
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs leading-4">
            <span>Tx</span>
            <span className="font-mono tabular-nums" title={chain.txHash}>
              {shortenHash(chain.txHash)}
            </span>
            <CopyHashButton hash={chain.txHash} />
            {chain.blockNumber !== null ? (
              <span>· Blok {formatNumber(chain.blockNumber)}</span>
            ) : null}
          </p>
          <TextLink href={etherscanTxUrl(chain.txHash)} external className="self-start">
            Lihat di Etherscan
          </TextLink>
        </div>
      </div>
    );
  }

  if (chain?.status === "FAILED") {
    return (
      <div className="flex w-full items-start gap-3 rounded-lg bg-destructive-muted px-4 py-3 text-destructive-muted-foreground">
        <WarningCircleIcon aria-hidden className="size-5 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-sm leading-5 font-semibold">Pencatatan on-chain gagal</p>
          <p className="text-xs leading-4">
            Jaringan Sepolia tidak merespons. Pembayaranmu tetap lunas di sistem.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full items-start gap-3 rounded-lg bg-info-muted px-4 py-3 text-info-muted-foreground">
      <CircleNotchIcon aria-hidden className="size-5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm leading-5 font-semibold">Menunggu pencatatan on-chain</p>
        <p className="text-xs leading-4">
          Transaksi sedang dikirim ke jaringan Sepolia. Biasanya selesai dalam 1 menit.
        </p>
      </div>
    </div>
  );
}
