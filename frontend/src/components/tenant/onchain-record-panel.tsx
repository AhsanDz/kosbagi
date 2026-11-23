"use client";

import type { ReactNode } from "react";
import { ArrowSquareOutIcon, CopyIcon, EyeIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import type { ChainRecordDto, RentReceiptDto } from "@/lib/api/types";
import { periodLabel, roomLabel } from "@/lib/billing";
import { copyToClipboard } from "@/lib/clipboard";
import {
  etherscanTxUrl,
  formatDateTimeWib,
  formatNumber,
  shortenHash,
} from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Status panel untuk penghuni. Tidak ada keadaan gagal: pencatatan yang gagal
 * dibaca menunggu karena pengulangannya tugas admin (P4).
 */
type PanelStatus = "RECORDED" | "PENDING" | "NOT_RECORDED";

const descriptions: Record<PanelStatus, string> = {
  RECORDED:
    "Dicatat fungsi recordRent di kontrak KosLedger. Siapa pun bisa memeriksanya di Etherscan tanpa akun KosBagi.",
  PENDING:
    "Pembayaranmu sudah lunas. Catatan sedang dikirim ke Sepolia, biasanya kurang dari satu menit. Halaman ini diperbarui otomatis.",
  NOT_RECORDED:
    "Tagihan ini lunas sebelum KosBagi mulai mencatat sewa di Sepolia, jadi tidak punya catatan on-chain untuk diperiksa.",
};

interface PanelRowProps {
  label: ReactNode;
  children: ReactNode;
  mono?: boolean;
  muted?: boolean;
  first?: boolean;
  /** Label yang boleh terlipat dan nilai pendek yang tetap satu baris (mis. hash). */
  wrapLabel?: boolean;
}

function PanelRow({
  label,
  children,
  mono = false,
  muted = false,
  first = false,
  wrapLabel = false,
}: PanelRowProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4",
        first ? "pb-[11px]" : "border-t border-border py-[11px]"
      )}
    >
      <dt className={cn("text-muted-foreground", wrapLabel ? "min-w-0" : "shrink-0")}>{label}</dt>
      <dd
        className={cn(
          "text-right",
          wrapLabel ? "shrink-0 whitespace-nowrap" : "min-w-0 break-words",
          muted ? "text-muted-foreground" : "text-card-foreground",
          mono && !muted && "font-mono"
        )}
      >
        {children}
      </dd>
    </div>
  );
}

/** Nilai mentah argumen recordRent di samping labelnya, mis. "(room = 3)". */
function RawArg({ name, value }: { name: string; value: number }) {
  return <span className="text-muted-foreground"> ({name} = {value})</span>;
}

interface OnchainRecordPanelProps {
  chain: ChainRecordDto | null;
  receipt: RentReceiptDto;
  className?: string;
}

/**
 * Panel catatan on-chain (Figma: "Panel catatan on-chain"). Selalu gelap lewat
 * class "dark", jadi data rantai selalu tampil di permukaan gelap. Isinya
 * argumen recordRent (room, period, amount, paymentRef = keccak256(order_id))
 * dengan label yang mudah dibaca dan nilai mentahnya dalam kurung, supaya bisa
 * dicocokkan langsung dengan event RentRecorded di Etherscan. Properti bukan
 * argumen: satu KosLedger melayani satu properti, jadi properti ditandai oleh
 * alamat kontraknya. Lime hanya dipakai untuk teks Tercatat. Di ponsel hanya
 * tombol Lihat di Etherscan yang tampil.
 */
export function OnchainRecordPanel({ chain, receipt, className }: OnchainRecordPanelProps) {
  const onChain = receipt.onChain;
  // Nomor tagihan yang di-hash menjadi paymentRef; null hanya untuk data lampau.
  const orderId = receipt.orderId;
  const status: PanelStatus =
    !onChain || chain?.status === "NOT_RECORDED"
      ? "NOT_RECORDED"
      : chain?.status === "RECORDED"
        ? "RECORDED"
        : "PENDING";

  const txHash = status === "RECORDED" ? (chain?.txHash ?? onChain?.txHash ?? null) : null;
  const blockNumber = chain?.blockNumber ?? onChain?.blockNumber ?? null;

  return (
    <section
      aria-labelledby="judul-panel-onchain"
      className={cn(
        "dark flex flex-col gap-[22px] rounded-xl bg-card px-5 py-7 text-card-foreground md:px-8",
        className
      )}
    >
      <div className="flex flex-col gap-1.5">
        <h2 id="judul-panel-onchain" className="text-h4 font-semibold">
          Yang tercatat di Sepolia
        </h2>
        <p className="text-sm leading-5 text-muted-foreground">{descriptions[status]}</p>
      </div>

      <dl className="flex flex-col text-sm leading-5">
        <PanelRow label="Status" first>
          <StatusText status={status} blockNumber={blockNumber} />
        </PanelRow>
        {onChain ? (
          <>
            <PanelRow label="Kontrak" mono>
              {onChain.contractAddress ? (
                <span title={onChain.contractAddress}>
                  KosLedger {shortenHash(onChain.contractAddress)}
                </span>
              ) : (
                "KosLedger"
              )}
            </PanelRow>
            <PanelRow label="Fungsi" mono>
              recordRent
            </PanelRow>
            <PanelRow label="Properti" mono>
              {receipt.propertyCode}
              <span className="text-muted-foreground"> (dari alamat kontrak)</span>
            </PanelRow>
            <PanelRow label="Kamar" mono>
              {roomLabel(onChain.room)}
              <RawArg name="room" value={onChain.room} />
            </PanelRow>
            <PanelRow label="Periode" mono>
              {periodLabel(onChain.period)}
              <RawArg name="period" value={onChain.period} />
            </PanelRow>
            <PanelRow label="Nominal" mono>
              {formatNumber(onChain.amountIdr)}
              <RawArg name="amount" value={onChain.amountIdr} />
            </PanelRow>
            <PanelRow
              label={
                <span className="flex flex-col gap-0.5">
                  <span>Referensi pembayaran</span>
                  <span className="text-xs leading-4">paymentRef, keccak256 dari nomor tagihan</span>
                </span>
              }
              mono
              wrapLabel
            >
              <span title={onChain.paymentRef}>{shortenHash(onChain.paymentRef)}</span>
            </PanelRow>
            <PanelRow label="Hash transaksi" mono muted={!txHash}>
              {txHash ? (
                <span title={txHash}>{shortenHash(txHash)}</span>
              ) : status === "RECORDED" ? (
                // Catatan sudah ada on-chain, tetapi transaksi asalnya tidak ditemukan.
                "Tidak tersedia"
              ) : (
                "Belum ada"
              )}
            </PanelRow>
            {status !== "RECORDED" || onChain.blockTimestamp ? (
              <PanelRow label="Waktu blok" muted={!onChain.blockTimestamp}>
                {onChain.blockTimestamp && status === "RECORDED"
                  ? formatDateTimeWib(onChain.blockTimestamp)
                  : "Belum ada"}
              </PanelRow>
            ) : null}
          </>
        ) : null}
      </dl>

      {status === "NOT_RECORDED" ? null : (
        <>
          <p className="flex items-center gap-2.5 rounded-md border border-dashed border-border px-3.5 py-3 text-sm leading-5 text-muted-foreground">
            <EyeIcon aria-hidden className="size-[18px] shrink-0" />
            Tidak dicatat: nama penghuni, email, dan nomor virtual account.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center" data-print-hide>
            {txHash ? (
              <Button asChild className="w-full sm:w-auto">
                <a href={etherscanTxUrl(txHash)} target="_blank" rel="noopener noreferrer">
                  Lihat di Etherscan
                  <ArrowSquareOutIcon aria-hidden data-icon="inline-end" />
                  <span className="sr-only">(membuka tab baru)</span>
                </a>
              </Button>
            ) : (
              <Button type="button" disabled className="w-full sm:w-auto">
                Lihat di Etherscan
                <ArrowSquareOutIcon aria-hidden data-icon="inline-end" />
              </Button>
            )}
            {txHash ? (
              <Button
                type="button"
                variant="ghost"
                className="hidden md:inline-flex"
                onClick={() => void copyToClipboard(txHash, "Hash transaksi disalin")}
              >
                <CopyIcon aria-hidden data-icon="inline-start" />
                Salin hash
              </Button>
            ) : null}
          </div>
        </>
      )}

      {status === "RECORDED" && txHash && orderId ? (
        <div className="flex flex-col gap-1.5 border-t border-border pt-[18px] text-sm leading-5">
          <h3 className="font-semibold">Cara memeriksa sendiri</h3>
          <ol className="flex list-inside list-decimal flex-col gap-1.5 text-muted-foreground">
            <li>Buka transaksi di Etherscan, lalu tab Logs.</li>
            <li>Cari event RentRecorded dari kontrak KosLedger.</li>
            <li>
              Cocokkan room, period, dan amount dengan nilai dalam kurung di atas. Pilih tampilan
              Dec bila Etherscan menampilkan angka heksadesimal.
            </li>
            <li>Cocokkan paymentRef dengan keccak256 dari {orderId}.</li>
          </ol>
        </div>
      ) : null}
    </section>
  );
}

function StatusText({ status, blockNumber }: { status: PanelStatus; blockNumber: number | null }) {
  switch (status) {
    case "RECORDED":
      return (
        <span className="text-success">
          {blockNumber != null ? `Tercatat di blok ${formatNumber(blockNumber)}` : "Tercatat"}
        </span>
      );
    case "NOT_RECORDED":
      return <span className="text-muted-foreground">Tidak dicatat, data lampau</span>;
    default:
      return <span className="text-warning">Menunggu pencatatan</span>;
  }
}
