"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";

import { KycRejectDialog } from "@/components/admin/kyc-reject-dialog";
import { KycReviewSheet } from "@/components/admin/kyc-review-sheet";
import { KycTable } from "@/components/admin/kyc-table";
import { LoadError } from "@/components/common/load-error";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toApiError } from "@/lib/api/client";
import { approveKyc, fetchKycList, kycListKey, rejectKyc } from "@/lib/api/kyc";
import type { KycAdminItemDto, KycListPayload, KycReviewPayload, KycStatus } from "@/lib/api/types";

const TABS: { status: KycStatus; label: string }[] = [
  { status: "SUBMITTED", label: "Menunggu" },
  { status: "APPROVED", label: "Disetujui" },
  { status: "REJECTED", label: "Ditolak" },
];

/** Whitelist on-chain biasanya selesai kurang dari satu menit, jadi tab Disetujui dipantau. */
const WHITELIST_REFRESH_MS = 5_000;

/** Daftar dipantau selama ada dompet yang whitelist-nya belum tercatat. */
function hasPendingWhitelist(payload: KycListPayload): boolean {
  return payload.submissions.some(
    (item) => item.status === "APPROVED" && item.wallet?.whitelist.status === "PENDING"
  );
}

function isKycListKey(key: unknown): boolean {
  return typeof key === "string" && key.startsWith("/kyc?");
}

function mergeReview(item: KycAdminItemDto, result: KycReviewPayload): KycAdminItemDto {
  return { ...item, ...result.kyc, wallet: result.wallet ?? item.wallet };
}

/**
 * Isi /admin/kyc: tab Menunggu, Disetujui, dan Ditolak dengan jumlah, tabel
 * pengajuan, Sheet tinjau di kanan, dan Dialog tolak dengan alasan wajib.
 */
export function KycReview() {
  const { mutate: mutateGlobal } = useSWRConfig();
  const [tab, setTab] = useState<KycStatus>("SUBMITTED");
  const [counts, setCounts] = useState<KycListPayload["counts"] | null>(null);
  const [selected, setSelected] = useState<KycAdminItemDto | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Interval berupa angka dari hasil terakhir: SWR hanya memulai polling bila
  // intervalnya bukan 0 saat efeknya dipasang, jadi fungsi interval tidak cukup.
  const [watchList, setWatchList] = useState(false);
  const list = useSWR(kycListKey(tab), fetchKycList, {
    refreshInterval: watchList ? WHITELIST_REFRESH_MS : 0,
    onSuccess: (data) => {
      setCounts(data.counts);
      setWatchList(hasPendingWhitelist(data));
    },
  });

  // Pengajuan yang baru disetujui pindah ke tab Disetujui. Selama Sheet menampilkan
  // pengajuan itu dan whitelist belum tercatat, statusnya dibaca dari daftar Disetujui.
  const followApproved =
    sheetOpen && selected?.status === "APPROVED" && selected.wallet?.whitelist.status !== "RECORDED";
  const approvedList = useSWR(followApproved ? kycListKey("APPROVED") : null, fetchKycList, {
    refreshInterval: WHITELIST_REFRESH_MS,
  });

  const sheetItem =
    (selected &&
      (list.data?.submissions.find((item) => item.id === selected.id) ??
        approvedList.data?.submissions.find((item) => item.id === selected.id))) ||
    selected;

  const refreshLists = useCallback(() => mutateGlobal(isKycListKey), [mutateGlobal]);

  const openItem = useCallback((item: KycAdminItemDto) => {
    setSelected(item);
    setSheetOpen(true);
  }, []);

  const approve = useCallback(async () => {
    if (!sheetItem) return;
    setApproving(true);
    try {
      const result = await approveKyc(sheetItem.id);
      setSelected(mergeReview(sheetItem, result));
      toast.success(`Pengajuan ${sheetItem.user.name} disetujui`, {
        description: "Dompet kustodian dibuat. Pencatatan lolos KYC sedang dikirim ke Sepolia.",
        position: "bottom-center",
      });
    } catch (error) {
      const apiError = toApiError(error);
      toast.error("Pengajuan belum disetujui", {
        description: apiError.message,
        position: "bottom-center",
      });
    } finally {
      setApproving(false);
      void refreshLists();
    }
  }, [refreshLists, sheetItem]);

  const reject = useCallback(
    async (reason: string): Promise<string | null> => {
      if (!sheetItem) return null;
      setRejecting(true);
      try {
        const result = await rejectKyc(sheetItem.id, reason);
        setSelected(mergeReview(sheetItem, result));
        setRejectOpen(false);
        toast.success(`Pengajuan ${sheetItem.user.name} ditolak`, {
          description: "Investor bisa membaca alasannya dan mengajukan lagi.",
          position: "bottom-center",
        });
        return null;
      } catch (error) {
        const apiError = toApiError(error);
        if (apiError.code === "VALIDATION_ERROR") return apiError.message;
        setRejectOpen(false);
        toast.error("Pengajuan belum ditolak", {
          description: apiError.message,
          position: "bottom-center",
        });
        return null;
      } finally {
        setRejecting(false);
        void refreshLists();
      }
    },
    [refreshLists, sheetItem]
  );

  return (
    <div className="flex flex-col gap-5 p-4 md:p-8">
      <Tabs value={tab} onValueChange={(value) => setTab(value as KycStatus)} className="gap-5">
        <TabsList variant="line" className="gap-5 sm:gap-5" aria-label="Status pengajuan KYC">
          {TABS.map(({ status, label }) => (
            <TabsTrigger key={status} value={status}>
              {counts ? `${label} (${counts[status] ?? 0})` : label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map(({ status }) => (
          <TabsContent key={status} value={status}>
            {status !== tab ? null : !list.data && list.error ? (
              <LoadError
                title="Pengajuan KYC gagal dimuat"
                retrying={list.isValidating}
                onRetry={() => void list.mutate()}
              />
            ) : (
              <KycTable status={status} items={list.data?.submissions} onOpen={openItem} />
            )}
          </TabsContent>
        ))}
      </Tabs>

      <KycReviewSheet
        item={sheetItem}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        approving={approving}
        onApprove={() => void approve()}
        onReject={() => setRejectOpen(true)}
      />
      <KycRejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        investorName={sheetItem?.user.name ?? "investor"}
        submitting={rejecting}
        onSubmit={reject}
      />
    </div>
  );
}
