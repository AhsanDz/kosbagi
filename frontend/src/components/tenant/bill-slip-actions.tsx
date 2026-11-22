"use client";

import { useCallback } from "react";
import {
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
import { PAID_VIEW_STATES, type BillViewState } from "@/lib/billing";

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
 * keadaan tagihan. Tombol Lihat kuitansi menyusul di progress 3, saat halaman
 * /penghuni/tagihan/[id] sudah ada.
 */
export function BillSlipActions({ bill, state }: { bill: BillDto; state: BillViewState }) {
  const { startPayment, resumePayment, markPaymentExpired } = useTenantBilling();
  const paymentId = bill.payment?.id;

  const handleExpired = useCallback(() => {
    if (paymentId) markPaymentExpired(paymentId);
  }, [paymentId, markPaymentExpired]);

  if (PAID_VIEW_STATES.includes(state)) {
    return <ChainStatusStack chain={bill.chain} />;
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
