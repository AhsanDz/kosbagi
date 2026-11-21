"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import useSWR from "swr";
import { CaretRightIcon, CopyIcon, FileTextIcon } from "@phosphor-icons/react/ssr";

import { LoadError } from "@/components/common/load-error";
import { OnchainRecordPanel } from "@/components/tenant/onchain-record-panel";
import { RentReceipt } from "@/components/tenant/rent-receipt";
import { ReceiptNotFound, ReceiptSkeleton } from "@/components/tenant/receipt-states";
import { useTenantBilling } from "@/components/tenant/tenant-billing-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { billKey, fetchBill } from "@/lib/api/bills";
import { ApiError } from "@/lib/api/client";
import { copyToClipboard } from "@/lib/clipboard";
import { formatPeriod } from "@/lib/format";

/** Selama pencatatan masih berjalan, kuitansi diperbarui tiap 5 detik. */
const PENDING_REFRESH_MS = 5_000;

function ReceiptBreadcrumb({ current }: { current: ReactNode }) {
  return (
    <nav aria-label="Lokasi halaman" data-print-hide>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm leading-5">
        <li>
          <Link
            href="/penghuni/tagihan"
            className="rounded-sm font-medium text-foreground underline underline-offset-4 hover:decoration-2"
          >
            Tagihan
          </Link>
        </li>
        <li aria-hidden className="flex text-muted-foreground">
          <CaretRightIcon className="size-3.5" />
        </li>
        <li aria-current="page" className="text-muted-foreground">
          {current}
        </li>
      </ol>
    </nav>
  );
}

/**
 * Isi /penghuni/tagihan/[id] (Figma: Penghuni / Kuitansi): Kuitansi sewa 480 px
 * di kiri dan Panel catatan on-chain di kanan. Di bawah 1280 px keduanya
 * bertumpuk. Aksi Salin nomor tagihan dan Salin hash hanya ada di desktop;
 * Salin nomor tagihan tidak ada untuk data lampau karena tagihannya tanpa order_id.
 */
export function ReceiptView({ billId }: { billId: string }) {
  const { paidBills } = useTenantBilling();
  // Interval berupa angka dari hasil terakhir: SWR hanya memulai polling bila
  // intervalnya bukan 0 saat efeknya dipasang, jadi fungsi interval tidak cukup.
  const [recording, setRecording] = useState(false);
  const detail = useSWR(billKey(billId), fetchBill, {
    refreshInterval: recording ? PENDING_REFRESH_MS : 0,
    onSuccess: (data) => setRecording(data.bill.chain?.status === "PENDING"),
  });

  const bill = detail.data?.bill;
  const receipt = bill?.status === "PAID" ? bill.receipt : null;
  // Data lampau tidak punya order_id, jadi tidak ada nomor tagihan untuk disalin.
  const orderId = receipt?.orderId ?? null;
  const notFound =
    (detail.error instanceof ApiError && detail.error.status === 404) ||
    (bill !== undefined && receipt === null);

  // Periode untuk remah roti sudah diketahui dari riwayat sebelum detail selesai dimuat.
  const knownPeriod = bill?.period ?? paidBills.find((item) => item.id === billId)?.period;
  const crumb = notFound ? (
    "Kuitansi"
  ) : knownPeriod ? (
    `Kuitansi ${formatPeriod(knownPeriod)}`
  ) : (
    <Skeleton className="h-3.5 w-36" />
  );

  let content: ReactNode;
  if (notFound) {
    content = <ReceiptNotFound />;
  } else if (detail.error && !bill) {
    content = (
      <LoadError
        title="Kuitansi gagal dimuat"
        retrying={detail.isValidating}
        onRetry={() => void detail.mutate()}
      />
    );
  } else if (!bill || !receipt) {
    content = <ReceiptSkeleton />;
  } else {
    content = (
      <div className="grid items-start gap-4 md:gap-8 xl:grid-cols-[480px_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <RentReceipt bill={bill} receipt={receipt} />
          <div className="flex gap-3" data-print-hide>
            <Button
              type="button"
              variant="outline"
              className="flex-1 md:flex-none"
              onClick={() => window.print()}
            >
              <FileTextIcon aria-hidden data-icon="inline-start" />
              Cetak kuitansi
            </Button>
            {orderId ? (
              <Button
                type="button"
                variant="ghost"
                className="hidden md:inline-flex"
                onClick={() => void copyToClipboard(orderId, "Nomor tagihan disalin")}
              >
                <CopyIcon aria-hidden data-icon="inline-start" />
                Salin nomor tagihan
              </Button>
            ) : null}
          </div>
        </div>
        <OnchainRecordPanel chain={bill.chain} receipt={receipt} className="min-w-0" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-5 md:p-8">
      <ReceiptBreadcrumb current={crumb} />
      {content}
    </div>
  );
}
