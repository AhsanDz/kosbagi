"use client";

import {
  BillingError,
  BillSlipSkeleton,
  EmptyBillCard,
  HistorySkeleton,
} from "@/components/tenant/billing-states";
import { BillSlip } from "@/components/tenant/bill-slip";
import { BillSlipCompact } from "@/components/tenant/bill-slip-compact";
import { HistoryCard } from "@/components/tenant/history-card";
import { ProofCard } from "@/components/tenant/proof-card";
import { RoomCard } from "@/components/tenant/room-card";
import { useTenantBilling } from "@/components/tenant/tenant-billing-provider";

/**
 * Isi /penghuni: Slip ringkas, lalu Kartu riwayat + Kartu kamar, lalu Kartu
 * bukti. Di bawah 1024 px Slip ringkas diganti Slip tagihan tegak.
 */
export function TenantOverview() {
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
      <div aria-busy="true" className="flex flex-col gap-4 p-4 md:gap-6 md:p-8">
        <p className="sr-only">Memuat ringkasan.</p>
        <BillSlipSkeleton />
        <HistorySkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-8">
      {bill && billState ? (
        <>
          <BillSlipCompact bill={bill} state={billState} className="hidden lg:flex" />
          <BillSlip bill={bill} room={room} state={billState} className="lg:hidden" />
        </>
      ) : (
        <EmptyBillCard />
      )}
      <div className="grid gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <HistoryCard bills={paidBills} summary />
        {room ? <RoomCard room={room} /> : null}
      </div>
      <ProofCard />
    </div>
  );
}
