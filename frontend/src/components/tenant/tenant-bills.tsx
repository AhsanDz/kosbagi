"use client";

import {
  BillingError,
  BillSlipSkeleton,
  EmptyBillCard,
  HistorySkeleton,
  TrailSkeleton,
} from "@/components/tenant/billing-states";
import { BillSlip } from "@/components/tenant/bill-slip";
import { HistoryCard } from "@/components/tenant/history-card";
import { PaymentTrail } from "@/components/tenant/payment-trail";
import { useTenantBilling } from "@/components/tenant/tenant-billing-provider";

const GRID_CLASS =
  "grid items-start gap-4 p-4 md:gap-6 md:p-8 xl:grid-cols-[440px_minmax(0,1fr)] xl:gap-8";
const SIDE_COLUMN_CLASS = "flex min-w-0 flex-col gap-4 md:gap-6";

/**
 * Isi /penghuni/tagihan: Slip tagihan 440 px di kiri, Jejak pembayaran dan Kartu
 * riwayat di kanan. Di bawah 1280 px kolom ditumpuk karena kolom kanan terlalu
 * sempit, dan Jejak pembayaran tidak ditampilkan di ponsel.
 */
export function TenantBills() {
  const { status, bill, room, paidBills, billState, retrying, retry } = useTenantBilling();

  if (status === "error") {
    return (
      <div className="p-4 md:p-8">
        <BillingError retrying={retrying} onRetry={retry} />
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div aria-busy="true" className={GRID_CLASS}>
        <p className="sr-only">Memuat tagihan.</p>
        <BillSlipSkeleton />
        <div className={SIDE_COLUMN_CLASS}>
          <TrailSkeleton className="hidden md:flex" />
          <HistorySkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className={GRID_CLASS}>
      {bill && billState ? (
        <BillSlip bill={bill} room={room} state={billState} />
      ) : (
        <EmptyBillCard />
      )}
      <div className={SIDE_COLUMN_CLASS}>
        {bill && billState ? (
          <PaymentTrail period={bill.period} state={billState} className="hidden md:flex" />
        ) : null}
        <HistoryCard bills={paidBills} />
      </div>
    </div>
  );
}
