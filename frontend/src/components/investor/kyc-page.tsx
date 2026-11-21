"use client";

import { useState } from "react";
import useSWR from "swr";

import { LoadError } from "@/components/common/load-error";
import { KycForm } from "@/components/investor/kyc-form";
import { KycStatusCard } from "@/components/investor/kyc-status-card";
import { KycTrail } from "@/components/investor/kyc-trail";
import { Skeleton } from "@/components/ui/skeleton";
import { CURRENT_USER_KEY, fetchCurrentUser } from "@/lib/api/session";
import { fetchMyKyc, MY_KYC_KEY } from "@/lib/api/kyc";
import type { KycDto, MyKycPayload } from "@/lib/api/types";
import { resolveKycViewState } from "@/lib/kyc";

const GRID_CLASS =
  "grid items-start gap-4 p-4 md:gap-8 md:p-8 xl:grid-cols-[minmax(0,1fr)_400px]";

/**
 * Pengajuan bisa berubah di luar halaman ini (admin menyetujui, worker mencatat
 * whitelist), jadi data diminta ulang berkala selama masih ada yang ditunggu.
 */
function refreshIntervalFor(latest: MyKycPayload): number {
  const state = resolveKycViewState(latest);
  if (state === "REGISTERING") return 5_000;
  if (state === "SUBMITTED") return 10_000;
  return 0;
}

/** Kerangka halaman KYC (Figma: Investor / KYC / Memuat). */
function KycSkeleton() {
  return (
    <div aria-busy="true" className={GRID_CLASS}>
      <p className="sr-only">Memuat data KYC.</p>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-5 w-55 max-w-full" />
          <Skeleton className="h-3 w-90 max-w-full" />
          <Skeleton className="h-3 w-80 max-w-full" />
          <Skeleton className="h-3 w-65 max-w-full" />
        </div>
        {["kartu-1", "kartu-2", "kartu-3"].map((key) => (
          <div key={key} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-3.5 w-30" />
            <Skeleton className="h-7.5 w-40 max-w-full" />
            <Skeleton className="h-3 w-50 max-w-full" />
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-5 w-55 max-w-full" />
        <Skeleton className="h-3 w-90 max-w-full" />
        <Skeleton className="h-3 w-80 max-w-full" />
        <Skeleton className="h-3 w-65 max-w-full" />
      </div>
    </div>
  );
}

/**
 * Isi /investor/kyc: form di kiri dan Jejak KYC 400 px di kanan. Setelah
 * mengajukan, form diganti Kartu status KYC. Saat ditolak, alasan admin tampil
 * di kartu dan form Ajukan lagi muncul di bawahnya.
 */
export function KycPage() {
  // Interval berupa angka dari hasil terakhir: SWR hanya memulai polling bila
  // intervalnya bukan 0 saat efeknya dipasang, jadi fungsi interval tidak cukup.
  const [refreshInterval, setRefreshInterval] = useState(0);
  const kycQuery = useSWR(MY_KYC_KEY, fetchMyKyc, {
    refreshInterval,
    onSuccess: (latest) => setRefreshInterval(refreshIntervalFor(latest)),
  });
  const userQuery = useSWR(CURRENT_USER_KEY, fetchCurrentUser, { revalidateOnFocus: false });
  const { data, error, isValidating, mutate } = kycQuery;

  if (!data && error) {
    return (
      <div className="p-4 md:p-8">
        <LoadError
          title="Data KYC gagal dimuat"
          retrying={isValidating}
          onRetry={() => void mutate()}
        />
      </div>
    );
  }

  if (!data) return <KycSkeleton />;

  const state = resolveKycViewState(data);
  const accountName = userQuery.data?.user.name ?? "";

  const handleSubmitted = (kyc: KycDto) => {
    void mutate({ kyc, wallet: null }, { revalidate: true });
  };

  return (
    <div className={GRID_CLASS}>
      <div className="flex min-w-0 flex-col gap-6">
        {state === "NONE" || !data.kyc ? (
          <KycForm
            // Nama akun baru diketahui setelah sesi dimuat; form diisi ulang sekali saat itu.
            key={accountName ? "dengan-nama" : "tanpa-nama"}
            mode="first"
            defaultValues={{ fullName: accountName, dummyIdNumber: "" }}
            onSubmitted={handleSubmitted}
            onStale={() => void mutate()}
          />
        ) : (
          <KycStatusCard state={state} kyc={data.kyc} wallet={data.wallet} />
        )}
        {state === "REJECTED" && data.kyc ? (
          <KycForm
            key={data.kyc.id}
            mode="retry"
            defaultValues={{ fullName: data.kyc.fullName, dummyIdNumber: data.kyc.dummyIdNumber }}
            onSubmitted={handleSubmitted}
            onStale={() => void mutate()}
          />
        ) : null}
      </div>
      <KycTrail state={state} />
    </div>
  );
}
