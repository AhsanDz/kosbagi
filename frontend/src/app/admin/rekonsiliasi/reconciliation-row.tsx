"use client";

import { useId, useState } from "react";
import { ArrowSquareOutIcon, CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { formatDateTimeWib, formatNumber, formatPeriod, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { ReconciliationAnomaly, ReconciliationRow as Row, ReconciliationSource } from "./api";
import {
  chainStatusView,
  databaseStatusView,
  MidtransStatus,
  ResultBadge,
  StatusLabel,
} from "./status-cells";

/** Jumlah kolom tabel, untuk sel rincian yang membentang selebar baris. */
export const COLUMN_COUNT = 7;

const kindLabel: Record<Row["kind"], string> = { RENT: "Sewa", BUY: "Beli token" };

function rupiahOrDash(value: number | null): string {
  return value === null ? "-" : formatRupiah(value);
}

function writeCall(row: Row): string {
  return row.kind === "RENT" ? "recordRent" : "transferFromTreasury";
}

interface SourceCard {
  source: ReconciliationSource;
  label: string;
  value: string;
  description: string;
  link?: { href: string; label: string };
}

function midtransCard(row: Row): SourceCard {
  const { status, grossAmountIdr } = row.midtrans;
  // Nominal berbeda karena Midtrans sendiri mencatat nominal lain (BUY-SMR01-0004), bukan hanya
  // notifikasi palsu yang ditolak (skenario uji 7, API status tetap benar).
  const fromNotification =
    row.anomalies.some((anomaly) => anomaly.type === "AMOUNT_MISMATCH") &&
    grossAmountIdr !== null &&
    grossAmountIdr !== row.database.amountIdr;
  let value = rupiahOrDash(grossAmountIdr);
  let description = fromNotification ? "gross_amount notifikasi dan API status" : `gross_amount API status, ${status}`;
  if (status === "not_found") {
    value = "Tidak ada";
    description = "transaksi tidak ditemukan di Midtrans";
  } else if (status === "error") {
    value = "Tidak terbaca";
    description = "API status gagal dicek";
  }
  return { source: "MIDTRANS", label: "Midtrans", value, description };
}

function databaseCard(row: Row): SourceCard {
  const { roomNumber, period, tokenAmount } = row.subject;
  if (row.database.status === "NOT_FOUND") {
    return { source: "DATABASE", label: "Database", value: "Tidak ada", description: "order_id tidak dikenal" };
  }
  const description =
    row.kind === "RENT"
      ? `nominal tagihan ${roomNumber ?? ""}${period ? ` ${formatPeriod(period)}` : ""}`.trim()
      : `nominal pesanan ${tokenAmount === null ? "" : `${formatNumber(tokenAmount)} token`}`.trim();
  return {
    source: "DATABASE",
    label: "Database",
    value: rupiahOrDash(row.database.amountIdr),
    description,
  };
}

function chainCard(row: Row): SourceCard {
  const { chain } = row;
  const card: SourceCard = { source: "CHAIN", label: "Sepolia", value: "Tidak ada", description: "" };
  switch (chain.status) {
    case "RECORDED":
      card.value = chain.amountIdr === null ? "Tidak terbaca" : formatRupiah(chain.amountIdr);
      card.description =
        chain.blockNumber === null ? `${writeCall(row)} tercatat` : `${writeCall(row)} di blok ${formatNumber(chain.blockNumber)}`;
      if (chain.explorerUrl) card.link = { href: chain.explorerUrl, label: "Lihat di Etherscan" };
      break;
    case "PENDING":
      card.value = "Belum ada";
      card.description =
        chain.jobStatus === "FAILED" ? `${writeCall(row)} gagal dicatat` : `${writeCall(row)} menunggu dikirim worker`;
      break;
    case "ERROR":
      card.value = "Tidak terbaca";
      card.description = "kontrak tidak bisa dibaca saat pemeriksaan";
      break;
    case "NONE":
      card.description = row.kind === "RENT" ? "recordRent tidak dibuat" : "transfer token tidak dibuat";
      break;
  }
  return card;
}

function SourceCardView({ card, flagged }: { card: SourceCard; flagged: boolean }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-0.5 rounded-md px-3.5 py-3",
        flagged ? "bg-destructive-muted text-destructive-muted-foreground" : "bg-muted"
      )}
    >
      <p className={cn("text-xs leading-4 font-medium", !flagged && "text-muted-foreground")}>
        {card.label}
        {flagged ? <span className="sr-only"> (menyimpang)</span> : null}
      </p>
      <p className={cn("text-base leading-6 font-medium", !flagged && "text-foreground")}>{card.value}</p>
      <p className={cn("text-xs leading-4 break-words whitespace-normal", !flagged && "text-muted-foreground")}>
        {card.description}
      </p>
      {card.link ? (
        <a
          href={card.link.href}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-xs leading-4 font-medium underline decoration-1 underline-offset-4 hover:decoration-2"
        >
          {card.link.label}
          <ArrowSquareOutIcon aria-hidden className="size-3.5" />
        </a>
      ) : null}
    </div>
  );
}

function AnomalyList({ anomalies }: { anomalies: ReconciliationAnomaly[] }) {
  return (
    <ul className="flex w-full flex-col gap-2 rounded-md border border-border px-3.5 py-3 text-sm leading-5 whitespace-normal">
      {anomalies.map((anomaly) => (
        <li key={`${anomaly.type}-${anomaly.createdAt}`} className="flex flex-col gap-0.5">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-mono text-xs leading-4 text-foreground">{anomaly.type}</span>
            <span className="text-xs leading-4 text-muted-foreground">
              dicatat {formatDateTimeWib(anomaly.createdAt)}, diterima {formatNumber(anomaly.occurrences)} kali
            </span>
          </span>
          {anomaly.expectedAmountIdr !== null || anomaly.receivedAmountIdr !== null ? (
            <span className="text-muted-foreground">
              Ditagihkan {rupiahOrDash(anomaly.expectedAmountIdr)}, diterima {rupiahOrDash(anomaly.receivedAmountIdr)}
            </span>
          ) : null}
          {anomaly.note ? <span className="text-muted-foreground">{anomaly.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/**
 * Satu order di tabel rekonsiliasi (Figma: "Baris rekonsiliasi", varian Cocok,
 * Selisih, dan Selisih terbuka). Baris Selisih punya caret; dibuka untuk
 * melihat nilai ketiga sumber, alasan selisih, dan anomali bila ada.
 */
export function ReconciliationRow({ row }: { row: Row }) {
  const [open, setOpen] = useState(false);
  const [showAnomalies, setShowAnomalies] = useState(false);
  const detailId = useId();
  const expandable = row.result === "MISMATCH";
  const chainView = chainStatusView(row);
  const toggle = () => setOpen((value) => !value);

  const cards = [midtransCard(row), databaseCard(row), chainCard(row)];

  return (
    <>
      <TableRow
        onClick={expandable ? toggle : undefined}
        className={cn("h-16 hover:bg-transparent", expandable && "cursor-pointer hover:bg-muted/40", open && "border-b-0")}
      >
        <TableCell className="px-4">
          <span className="flex min-w-0 items-center gap-1.5">
            {expandable ? (
              <button
                type="button"
                aria-expanded={open}
                aria-controls={detailId}
                onClick={(event) => {
                  event.stopPropagation();
                  toggle();
                }}
                className="-m-1 rounded-sm p-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
              >
                {open ? (
                  <CaretDownIcon aria-hidden className="size-3.5" />
                ) : (
                  <CaretRightIcon aria-hidden className="size-3.5" />
                )}
                <span className="sr-only">{open ? "Tutup" : "Buka"} rincian selisih {row.orderId}</span>
              </button>
            ) : (
              <span aria-hidden className="size-3.5 shrink-0" />
            )}
            <span className="truncate font-mono text-sm leading-5 text-card-foreground">{row.orderId}</span>
          </span>
        </TableCell>
        <TableCell className="text-sm leading-5 text-card-foreground">{kindLabel[row.kind]}</TableCell>
        <TableCell className="text-right text-sm leading-5 font-medium text-card-foreground tabular-nums">
          {rupiahOrDash(row.amountIdr)}
        </TableCell>
        <TableCell>
          <MidtransStatus status={row.midtrans.status} />
        </TableCell>
        <TableCell>
          <StatusLabel view={databaseStatusView(row)} />
        </TableCell>
        <TableCell>
          {chainView.label === "Tercatat" && row.chain.explorerUrl ? (
            <a
              href={row.chain.explorerUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="rounded-sm underline-offset-4 hover:underline"
              title={row.chain.txHash ?? undefined}
            >
              <StatusLabel view={chainView} />
              <span className="sr-only">, lihat transaksi di Etherscan</span>
            </a>
          ) : (
            <StatusLabel view={chainView} />
          )}
        </TableCell>
        <TableCell>
          <ResultBadge result={row.result} />
        </TableCell>
      </TableRow>

      {expandable && open ? (
        <TableRow id={detailId} className="hover:bg-transparent">
          <TableCell colSpan={COLUMN_COUNT} className="h-auto px-4 pt-1 pb-5 pl-[38px] whitespace-normal">
            <div className="flex flex-col gap-3.5">
              <div className="grid gap-3 md:grid-cols-3">
                {cards.map((card) => (
                  <SourceCardView key={card.source} card={card} flagged={row.flagged.includes(card.source)} />
                ))}
              </div>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <p className="min-w-0 flex-1 text-sm leading-5 text-muted-foreground">{row.reasons.join(" ")}</p>
                {row.anomalies.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    aria-expanded={showAnomalies}
                    onClick={() => setShowAnomalies((value) => !value)}
                  >
                    {showAnomalies ? "Sembunyikan anomali" : "Lihat anomali"}
                  </Button>
                ) : null}
              </div>
              {showAnomalies ? <AnomalyList anomalies={row.anomalies} /> : null}
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
