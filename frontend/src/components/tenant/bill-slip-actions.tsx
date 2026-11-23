"use client";

import { useCallback } from "react";
import Link from "next/link";
import {
  ArrowCounterClockwiseIcon,
  CircleNotchIcon,
  InfoIcon,
  WarningCircleIcon,
  WarningIcon,
} from "@phosphor-icons/react/ssr";

import { ChainStatusStack } from "@/components/common/chain-status-stack";
import { PaymentCountdown } from "@/components/tenant/payment-countdown";
import { useTenantBilling } from "@/components/tenant/tenant-billing-provider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { BillDto } from "@/lib/api/types";
import {
  billRefund,
  PAID_VIEW_STATES,
  receiptHref,
  tenantChain,
  type BillViewState,
} from "@/lib/billing";
import { formatDateTimeWib, formatPeriod, formatRupiah } from "@/lib/format";

function PayButton({ label, onClick }: { label: string; onClick: () => void }) {
  const { paying } = useTenantBilling();

  return (
    <Button type="button" className="w-full" disabled={paying} aria-busy={paying} onClick={onClick}>
      {paying ? (
        <CircleNotchIcon aria-hidden data-icon="inline-start" className="animate-spin" />
      ) : null}
      {label}
    </Button>
  );
}

/**
 * Bagian bawah Slip tagihan dan Slip ringkas: isi dan tombolnya mengikuti
 * keadaan tagihan. Tagihan lunas mendapat tombol Lihat kuitansi ke
 * /penghuni/tagihan/[id]. Status pencatatan memakai versi penghuni (tenantChain),
 * jadi tidak pernah menulis gagal. Periode yang sudah ditutup (P4) menonaktifkan
 * tombol Bayar, dan pembayaran yang masuk setelah ditutup ditulis sebagai dana
 * yang akan dikembalikan.
 */
export function BillSlipActions({ bill, state }: { bill: BillDto; state: BillViewState }) {
  const { startPayment, resumePayment, markPaymentExpired } = useTenantBilling();
  const paymentId = bill.payment?.id;

  const handleExpired = useCallback(() => {
    if (paymentId) markPaymentExpired(paymentId);
  }, [paymentId, markPaymentExpired]);

  if (PAID_VIEW_STATES.includes(state)) {
    return (
      <>
        <ChainStatusStack chain={tenantChain(bill.chain)} />
        <Button asChild variant="outline" className="w-full">
          <Link href={receiptHref(bill.id)}>Lihat kuitansi</Link>
        </Button>
      </>
    );
  }

  if (state === "REFUND_PENDING") {
    const refund = billRefund(bill);
    return (
      <Alert variant="warning">
        <ArrowCounterClockwiseIcon aria-hidden />
        <AlertTitle>Pembayaran diterima setelah periode ditutup, dana akan dikembalikan</AlertTitle>
        <AlertDescription>
          {refund
            ? `${formatRupiah(refund.amountIdr)} dibayar${refund.paidAt ? ` ${formatDateTimeWib(refund.paidAt)}` : ""} lewat ${refund.orderId}. `
            : ""}
          Tagihan ini tidak dicatat di Sepolia. Pengelola KosBagi akan mengembalikan danamu, jadi
          kamu tidak perlu membayar lagi.
        </AlertDescription>
      </Alert>
    );
  }

  if (state === "PERIOD_CLOSED") {
    return (
      <>
        <Button type="button" className="w-full" disabled aria-describedby={`tutup-${bill.id}`}>
          Bayar sewa
        </Button>
        <p id={`tutup-${bill.id}`} className="text-xs leading-4 text-muted-foreground">
          Periode {formatPeriod(bill.period)} sudah ditutup, jadi tagihan ini tidak bisa dibayar
          lewat KosBagi. Hubungi pengelola kos.
        </p>
      </>
    );
  }

  if (state === "PENDING" && bill.payment) {
    return (
      <>
        <PaymentCountdown expiresAt={bill.payment.expiresAt} onExpired={handleExpired} />
        <PayButton label="Lanjutkan pembayaran" onClick={resumePayment} />
      </>
    );
  }

  if (state === "CHECKING") {
    return (
      <Alert variant="info">
        <InfoIcon aria-hidden />
        <AlertTitle>Menunggu konfirmasi Midtrans</AlertTitle>
        <AlertDescription>Biasanya beberapa detik. Halaman ini diperbarui sendiri.</AlertDescription>
      </Alert>
    );
  }

  if (state === "EXPIRED") {
    return (
      <>
        <Alert variant="warning">
          <WarningIcon aria-hidden />
          <AlertTitle>Waktu pembayaran habis</AlertTitle>
          <AlertDescription>Batas 5 menit terlewat. Tagihan tetap belum dibayar.</AlertDescription>
        </Alert>
        <PayButton label="Bayar ulang" onClick={startPayment} />
      </>
    );
  }

  if (state === "FAILED") {
    return (
      <>
        <Alert variant="destructive">
          <WarningCircleIcon aria-hidden />
          <AlertTitle>Pembayaran tidak berhasil</AlertTitle>
          <AlertDescription>
            Midtrans menolak atau kamu membatalkan pembayaran. Tagihan tetap belum dibayar.
          </AlertDescription>
        </Alert>
        <PayButton label="Bayar ulang" onClick={startPayment} />
      </>
    );
  }

  return (
    <>
      <PayButton label="Bayar sewa" onClick={startPayment} />
      <p className="text-xs leading-4 text-muted-foreground">
        Pilih virtual account, QRIS, atau e-wallet di halaman Midtrans.
      </p>
    </>
  );
}
