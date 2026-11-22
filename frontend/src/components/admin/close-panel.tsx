"use client";

import type { ReactNode } from "react";
import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  InfoIcon,
  XCircleIcon,
} from "@phosphor-icons/react/ssr";

import { distributedTotal } from "@/components/admin/holder-shares";
import { ChainStatusStack } from "@/components/common/chain-status-stack";
import { DataRows, type DataRow } from "@/components/common/data-rows";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { PeriodPayload } from "@/lib/api/types";
import { closeButtonLabel, MAX_JOB_ATTEMPTS, type RequirementRow } from "@/lib/admin";
import { formatDateTimeWib, formatNumber, formatRupiah } from "@/lib/format";
import { periodMonthName, periodNumber } from "@/lib/period";
import { cn } from "@/lib/utils";

function PanelCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby="judul-panel-periode"
      className="flex flex-col gap-[18px] rounded-xl bg-card p-6 text-card-foreground md:p-7"
    >
      <div className="flex flex-col gap-1">
        <h2 id="judul-panel-periode" className="text-h4 font-semibold">
          {title}
        </h2>
        <p className="text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function RequirementList({ rows }: { rows: RequirementRow[] }) {
  return (
    <ul aria-label="Syarat penutupan">
      {rows.map((row) => (
        <li key={row.key} className="flex items-start gap-2.5 border-t border-border py-2.5">
          {row.ok ? (
            <CheckCircleIcon aria-hidden className="mt-px size-[18px] shrink-0" />
          ) : (
            <XCircleIcon aria-hidden className="mt-px size-[18px] shrink-0 text-destructive" />
          )}
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm leading-5 font-medium">
              {row.title}
              <span className="sr-only">{row.ok ? ": terpenuhi" : ": belum terpenuhi"}</span>
            </span>
            {row.detail ? <span className="text-xs leading-4 text-destructive">{row.detail}</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Kotak bukti closePeriod dan data penutupan (dipakai saat ditutup dan terdistribusi). */
function ClosedRecord({ payload }: { payload: PeriodPayload }) {
  const close = payload.close;
  const rows: DataRow[] = [];
  if (close?.snapshotBlock != null) rows.push({ label: "Blok snapshot", value: formatNumber(close.snapshotBlock) });
  if (close?.closedAt) rows.push({ label: "Ditutup", value: formatDateTimeWib(close.closedAt) });
  rows.push({ label: "Sewa bersih", value: formatRupiah(payload.receipt.netRentIdr) });

  return (
    <>
      <ChainStatusStack
        chain={{ status: "RECORDED", txHash: close?.txHash ?? null, blockNumber: close?.blockNumber ?? null }}
      />
      <DataRows rows={rows} divided className="border-t border-border" />
    </>
  );
}

interface ClosePanelProps {
  payload: PeriodPayload;
  rows: RequirementRow[];
  ready: boolean;
  retrying: boolean;
  distributing: boolean;
  onRequestClose: () => void;
  onRetryClose: () => void;
  onDistribute: () => void;
}

/**
 * Kartu kanan halaman Tutup periode (Figma: "Kartu syarat penutupan" dan
 * turunannya). Isinya mengikuti status periode: syarat penutupan, menutup,
 * penutupan gagal (Coba lagi untuk admin), ditutup (Jalankan distribusi), dan
 * distribusi selesai. Tutup periode dan distribusi sengaja dua tombol terpisah.
 */
export function ClosePanel({
  payload,
  rows,
  ready,
  retrying,
  distributing,
  onRequestClose,
  onRetryClose,
  onDistribute,
}: ClosePanelProps) {
  const month = periodMonthName(payload.period);
  const contractPeriod = periodNumber(payload.period);

  if (payload.status === "CLOSING") {
    return (
      <PanelCard
        title="Menutup periode"
        description="Transaksi closePeriod sedang dikirim. Jangan tutup halaman ini sampai tercatat."
      >
        <ChainStatusStack
          chain={{ status: "PENDING", txHash: null }}
          pendingDescription={`Transaksi closePeriod(${contractPeriod}) sedang dikirim ke Sepolia. Halaman ini diperbarui otomatis.`}
        />
        <Button type="button" disabled className="w-full">
          <CircleNotchIcon aria-hidden data-icon="inline-start" className="animate-spin" />
          Sedang menutup periode
        </Button>
      </PanelCard>
    );
  }

  if (payload.status === "CLOSE_FAILED") {
    const job = payload.close?.job;
    const cause = job?.lastError ? ` Penyebab terakhir: ${job.lastError}` : "";
    return (
      <PanelCard
        title="Penutupan gagal dicatat"
        description="closePeriod gagal setelah beberapa percobaan otomatis. Data periode belum berubah, jadi aman untuk diulang."
      >
        <ChainStatusStack
          chain={{ status: "FAILED", txHash: null }}
          failedDescription={`closePeriod(${contractPeriod}) gagal setelah ${job?.attempts ?? MAX_JOB_ATTEMPTS} percobaan.${cause}`}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={retrying || !job}
          aria-busy={retrying}
          onClick={onRetryClose}
        >
          <ArrowsClockwiseIcon
            aria-hidden
            data-icon="inline-start"
            className={retrying ? "animate-spin" : undefined}
          />
          Coba lagi
        </Button>
      </PanelCard>
    );
  }

  if (payload.status === "CLOSED") {
    return (
      <PanelCard
        title="Periode ditutup"
        description="Angka di struk sudah final dan tercatat di KosLedger. Jalankan distribusi untuk menambahkan bagian tiap pemegang ke saldonya."
      >
        <ClosedRecord payload={payload} />
        <Button
          type="button"
          className="w-full"
          disabled={distributing}
          aria-busy={distributing}
          onClick={onDistribute}
        >
          {distributing ? (
            <CircleNotchIcon aria-hidden data-icon="inline-start" className="animate-spin" />
          ) : null}
          Jalankan distribusi
        </Button>
        <p className="text-xs leading-4 text-muted-foreground">
          Bagian tiap pemegang dihitung dengan shareOf dari saldo di blok snapshot. Distribusi hanya
          bisa dijalankan sekali.
        </p>
      </PanelCard>
    );
  }

  if (payload.status === "DISTRIBUTED") {
    const distribution = payload.distribution;
    return (
      <PanelCard
        title="Distribusi selesai"
        description="Bagian tiap pemegang sudah masuk ke saldo bagi hasil. Distribusi tidak bisa dijalankan lagi untuk periode ini."
      >
        <ClosedRecord payload={payload} />
        {distribution ? (
          <Alert variant="success">
            <CheckCircleIcon aria-hidden />
            <AlertTitle>
              {formatRupiah(distributedTotal(distribution))} masuk ke saldo{" "}
              {distribution.holders.length} pemegang
            </AlertTitle>
            <AlertDescription>
              Dijalankan {formatDateTimeWib(distribution.distributedAt)} oleh{" "}
              {distribution.distributedBy.name}. Bagian perbendaharaan{" "}
              {formatRupiah(distribution.treasury.shareIdr)} masuk ke saldo pemilik lama. Sisa
              pembulatan {formatRupiah(distribution.roundingRemainderIdr)}.
            </AlertDescription>
          </Alert>
        ) : null}
        <Button type="button" disabled className="w-full">
          Distribusi sudah dijalankan
        </Button>
      </PanelCard>
    );
  }

  return (
    <PanelCard
      title="Syarat penutupan"
      description={
        ready
          ? "Semua syarat terpenuhi. Periode siap ditutup."
          : `Periode baru bisa ditutup setelah semua data ${month} tercatat di Sepolia.`
      }
    >
      <RequirementList rows={rows} />
      {payload.unpaidBills > 0 ? (
        <Alert variant="default" role="note">
          <InfoIcon aria-hidden />
          <AlertDescription>
            {payload.unpaidBills} tagihan {month} belum dibayar. Ini tidak menghalangi penutupan,
            tetapi tagihan itu tidak bisa dibayar lagi setelah periode ditutup.
          </AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="button"
        className={cn("w-full")}
        disabled={!ready}
        aria-describedby="keterangan-tutup-periode"
        onClick={onRequestClose}
      >
        {closeButtonLabel(payload.period)}
      </Button>
      <p id="keterangan-tutup-periode" className="text-xs leading-4 text-muted-foreground">
        {ready
          ? "Tidak bisa dibatalkan. Saldo pemegang dibaca dari blok tepat sebelum transaksi penutupan."
          : "Tombol aktif setelah semua sewa dan nota tercatat dan tidak ada job yang gagal."}
      </p>
    </PanelCard>
  );
}
