"use client";

import { useState } from "react";
import useSWR from "swr";

import { LoadError } from "@/components/common/load-error";
import { FollowUpCard } from "@/components/manager/follow-up-card";
import { RentSummaryCard } from "@/components/manager/rent-summary-card";
import { RoomStatusBoard } from "@/components/manager/room-status-board";
import { Skeleton } from "@/components/ui/skeleton";
import { expensesKey, fetchExpenses } from "@/lib/api/expenses";
import { fetchManagerRooms, managerRoomsKey } from "@/lib/api/manager";
import { roomsHavePending } from "@/lib/manager";

const PENDING_REFRESH_MS = 10_000;

/** Kerangka status kamar (Figma: Pengelola / Status kamar / Memuat). */
export function ManagerRoomsSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6 p-4 md:p-8">
      <p className="sr-only">Memuat status kamar.</p>
      <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-2.5 w-21" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-2.5 w-35" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {[1, 2, 3, 4, 5].map((key) => (
          <div key={key} className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3">
            <Skeleton className="h-2.5 w-17" />
            <Skeleton className="h-5 w-22" />
            <Skeleton className="h-2.5 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Isi /pengelola: Ringkasan sewa, Papan kamar dengan sepuluh Ubin kamar, dan
 * kartu Perlu ditindaklanjuti (GET /manager/rooms, ditambah status ditutup dari
 * GET /expenses untuk periode yang sama). Tanpa periode, backend
 * memakai periode berjalan dan semua teks memakai `data.period`. Dipantau ulang
 * selama ada sewa lunas yang menunggu pencatatan.
 */
export function ManagerRooms({ period }: { period: string | null }) {
  const [watch, setWatch] = useState(false);
  const { data, error, isValidating, mutate } = useSWR(
    managerRoomsKey(period),
    fetchManagerRooms,
    {
      refreshInterval: watch ? PENDING_REFRESH_MS : 0,
      onSuccess: (payload) => setWatch(roomsHavePending(payload)),
    }
  );
  // GET /manager/rooms tidak membawa status periode; GET /expenses membawa
  // `closed` untuk periode yang sama, dipakai kartu Perlu ditindaklanjuti (P5).
  const expenses = useSWR(data ? expensesKey(data.period) : null, fetchExpenses);

  if (!data && error) {
    return (
      <div className="p-4 md:p-8">
        <LoadError title="Status kamar gagal dimuat" retrying={isValidating} onRetry={() => void mutate()} />
      </div>
    );
  }
  if (!data) return <ManagerRoomsSkeleton />;

  return (
    <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-8">
      <RentSummaryCard payload={data} />
      <div className="grid items-start gap-4 md:gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <RoomStatusBoard rooms={data.rooms} />
        <FollowUpCard payload={data} periodClosed={expenses.data?.closed} />
      </div>
    </div>
  );
}
