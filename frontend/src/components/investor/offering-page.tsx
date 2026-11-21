"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { TrayIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import useSWR from "swr";

import { LoadError } from "@/components/common/load-error";
import { BuyTicket, type BuyTicketController } from "@/components/investor/buy-ticket";
import { OfferingSummary } from "@/components/investor/offering-summary";
import { BillSlipSkeleton } from "@/components/tenant/billing-states";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, toApiError } from "@/lib/api/client";
import { fetchMyKyc, MY_KYC_KEY } from "@/lib/api/kyc";
import {
  createPurchase,
  createPurchasePayment,
  CURRENT_OFFERING_KEY,
  fetchCurrentOffering,
  fetchPurchases,
  PURCHASES_KEY,
} from "@/lib/api/offerings";
import type {
  CustodialWalletDto,
  MyKycPayload,
  PurchaseDto,
  PurchasesPayload,
} from "@/lib/api/types";
import { MIDTRANS_CLIENT_KEY } from "@/lib/config";
import { loadSnap } from "@/lib/midtrans/snap";
import { parseTokenAmount, pickPurchase, resolveTicketState } from "@/lib/purchase";

/** Polling "Memeriksa pembayaran": tiap 3 detik, paling lama 60 detik (sama dengan tagihan). */
const CHECK_INTERVAL_MS = 3_000;
const CHECK_TIMEOUT_MS = 60_000;
/** Pencatatan whitelist dan transfer token biasanya selesai kurang dari satu menit. */
const CHAIN_REFRESH_MS = 5_000;
const DEFAULT_AMOUNT = "100";

/** Pesanan yang masih menunggu sesuatu di luar halaman ini: pembayaran atau pengiriman token. */
function hasOpenPurchase(latest: PurchasesPayload): boolean {
  return latest.purchases.some(
    (item) =>
      item.status === "PENDING_PAYMENT" ||
      (item.status === "PAID" && item.transfer?.status === "PENDING")
  );
}

/** Dompet yang KYC-nya sudah disetujui tetapi belum tercatat lolos KYC di KosToken. */
function walletPending(latest: MyKycPayload): boolean {
  return latest.kyc?.status === "APPROVED" && latest.wallet?.whitelist.status === "PENDING";
}

/** Rincian galat 422 dari backend: { tokensRemaining } atau { remainingQuota }. */
function numberDetail(error: ApiError, key: string): number | null {
  const details = error.details;
  if (details && typeof details === "object" && key in details) {
    const value = (details as Record<string, unknown>)[key];
    return typeof value === "number" ? value : null;
  }
  return null;
}

/** Menaruh pesanan terbaru di cache daftar pesanan, sebelum daftar dimuat ulang. */
function withPurchase(purchase: PurchaseDto) {
  return (current?: PurchasesPayload): PurchasesPayload => ({
    purchases: [purchase, ...(current?.purchases ?? []).filter((item) => item.id !== purchase.id)],
  });
}

/** Kerangka halaman penawaran (Figma: Investor / Penawaran / Memuat). */
function OfferingSkeleton() {
  return (
    <div
      aria-busy="true"
      className="grid items-start gap-4 p-4 md:gap-6 md:p-8 xl:grid-cols-[minmax(0,1fr)_432px] xl:gap-8"
    >
      <p className="sr-only">Memuat penawaran.</p>
      <div className="flex flex-col gap-5">
        {["kartu-1", "kartu-2"].map((key) => (
          <div key={key} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
            <Skeleton className="h-3.5 w-30" />
            <Skeleton className="h-7.5 w-40 max-w-full" />
            <Skeleton className="h-3 w-50 max-w-full" />
          </div>
        ))}
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-5 w-55 max-w-full" />
          <Skeleton className="h-3 w-90 max-w-full" />
          <Skeleton className="h-3 w-80 max-w-full" />
          <Skeleton className="h-3 w-65 max-w-full" />
        </div>
      </div>
      <BillSlipSkeleton />
    </div>
  );
}

interface OfferingPageProps {
  /** Kartu statis dari server: Dokumen tercatat di KosToken dan Ringkasan risiko. */
  documents: ReactNode;
  risks: ReactNode;
}

/**
 * Isi /investor/penawaran. Kolom kiri: Ringkasan penawaran, Dokumen, Risiko.
 * Tiket beli 432 px di kanan dan tetap terlihat saat halaman digulir. Di ponsel
 * urutannya Ringkasan, Tiket, Dokumen, Risiko. Seperti tagihan sewa, callback
 * Snap tidak pernah menandai lunas; hanya backend (lewat webhook) yang bisa.
 */
export function OfferingPage({ documents, risks }: OfferingPageProps) {
  const [trackedPurchaseId, setTrackedPurchaseId] = useState<string | null>(null);
  const [dismissedPurchaseId, setDismissedPurchaseId] = useState<string | null>(null);
  const [checkingPurchaseId, setCheckingPurchaseId] = useState<string | null>(null);
  const [expiredPurchaseId, setExpiredPurchaseId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState(DEFAULT_AMOUNT);
  const [agreed, setAgreed] = useState(false);
  const [paying, setPaying] = useState(false);

  // Data dipantau selama ada yang ditunggu: konfirmasi Midtrans, pesanan yang masih
  // menyisihkan token, pengiriman token, atau pencatatan whitelist dompet. Intervalnya
  // berupa angka dari hasil terakhir, karena SWR hanya memulai polling bila
  // intervalnya bukan 0 saat efeknya dipasang.
  const [watchOffering, setWatchOffering] = useState(false);
  const [watchPurchases, setWatchPurchases] = useState(false);
  const [watchKyc, setWatchKyc] = useState(false);
  const checkInterval = checkingPurchaseId ? CHECK_INTERVAL_MS : 0;

  const offeringQuery = useSWR(CURRENT_OFFERING_KEY, fetchCurrentOffering, {
    refreshInterval: checkInterval || (watchOffering ? CHAIN_REFRESH_MS : 0),
    onSuccess(data) {
      const waitingWallet = data.investor.kycStatus === "APPROVED" && !data.investor.walletReady;
      setWatchOffering(Boolean(data.activePurchase) || waitingWallet);
      // Pesanan yang masih menunggu bayar diikuti sampai selesai, supaya hasilnya
      // (lunas, kedaluwarsa, gagal) tetap tampil setelah keluar dari activePurchase.
      const active = data.activePurchase;
      if (active) setTrackedPurchaseId((current) => current ?? active.id);
    },
  });
  const purchasesQuery = useSWR(PURCHASES_KEY, fetchPurchases, {
    refreshInterval: checkInterval || (watchPurchases ? CHAIN_REFRESH_MS : 0),
    onSuccess(data) {
      setWatchPurchases(hasOpenPurchase(data));
      if (!checkingPurchaseId) return;
      const checked = data.purchases.find((item) => item.id === checkingPurchaseId);
      if (checked && checked.status !== "PENDING_PAYMENT") {
        setCheckingPurchaseId(null);
        if (checked.status === "PAID") toast.success("Pembayaran terkonfirmasi");
      }
    },
  });
  const kycQuery = useSWR(MY_KYC_KEY, fetchMyKyc, {
    refreshInterval: watchKyc ? CHAIN_REFRESH_MS : 0,
    onSuccess: (latest) => setWatchKyc(walletPending(latest)),
  });

  const { data, error, isValidating, mutate } = offeringQuery;
  const { mutate: mutatePurchases } = purchasesQuery;
  const refreshAll = useCallback(() => {
    void mutate();
    void mutatePurchases();
  }, [mutate, mutatePurchases]);

  const purchase = data
    ? pickPurchase(data, purchasesQuery.data?.purchases, { trackedPurchaseId, dismissedPurchaseId })
    : null;
  const state = data
    ? resolveTicketState(data, purchase, {
        checking: checkingPurchaseId !== null && checkingPurchaseId === purchase?.id,
        expiredPurchaseId,
      })
    : null;

  // Webhook bisa saja belum masuk (mis. tanpa ngrok). Polling berhenti setelah 60 detik.
  useEffect(() => {
    if (!checkingPurchaseId) return;
    const timer = setTimeout(() => {
      setCheckingPurchaseId(null);
      toast.info("Konfirmasi Midtrans belum masuk", {
        description: "Muat ulang halaman ini beberapa saat lagi untuk melihat statusnya.",
      });
    }, CHECK_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [checkingPurchaseId]);

  const openSnap = useCallback(
    async (getPayment: () => Promise<{ purchase: PurchaseDto; snapToken: string }>) => {
      if (!MIDTRANS_CLIENT_KEY) {
        toast.error("Pembayaran belum bisa dibuka", {
          description: "Client key Midtrans belum diisi di frontend/.env.local.",
        });
        return;
      }

      setPaying(true);
      try {
        const snap = await loadSnap(MIDTRANS_CLIENT_KEY);
        const { purchase: opened, snapToken } = await getPayment();
        setTrackedPurchaseId(opened.id);
        setDismissedPurchaseId(null);
        void mutatePurchases(withPurchase(opened), { revalidate: true });
        void mutate();

        snap.pay(snapToken, {
          onSuccess: () => {
            setCheckingPurchaseId(opened.id);
            refreshAll();
          },
          onPending: refreshAll,
          onError: () => {
            toast.error("Pembayaran tidak berhasil", {
              description: "Midtrans menolak pembayaran. Token yang disisihkan dilepas lagi.",
            });
            refreshAll();
          },
          onClose: refreshAll,
        });
      } catch (caught) {
        const apiError = toApiError(caught);

        // Skenario 8 dan 9 juga ditolak backend: perbarui angka supaya pesan inline muncul.
        if (apiError.code === "OFFERING_EXCEEDED" || apiError.code === "HOLDING_CAP_EXCEEDED") {
          const tokensRemaining = numberDetail(apiError, "tokensRemaining");
          const remainingQuota = numberDetail(apiError, "remainingQuota");
          void mutate(
            (current) =>
              current && {
                ...current,
                offering: {
                  ...current.offering,
                  tokensRemaining: tokensRemaining ?? current.offering.tokensRemaining,
                },
                investor: {
                  ...current.investor,
                  remainingQuota: remainingQuota ?? current.investor.remainingQuota,
                },
              },
            { revalidate: true }
          );
          return;
        }

        toast.error("Pembayaran belum bisa dibuka", {
          description:
            caught instanceof ApiError
              ? apiError.message
              : "Halaman Midtrans gagal dimuat. Periksa koneksi, lalu coba lagi.",
        });
        // Mis. PURCHASE_PENDING, WALLET_NOT_READY, OFFERING_CLOSED: tampilkan status terbaru.
        refreshAll();
        void kycQuery.mutate();
      } finally {
        setPaying(false);
      }
    },
    [kycQuery, mutate, mutatePurchases, refreshAll]
  );

  const offeringId = data?.offering.id;
  const pay = useCallback(() => {
    const amount = parseTokenAmount(amountText);
    if (!offeringId || amount === null) return;
    void openSnap(async () => {
      const { purchase: created } = await createPurchase(offeringId, amount);
      const token = created.payment?.snapToken;
      if (!token) throw new Error("Token pembayaran kosong");
      return { purchase: created, snapToken: token };
    });
  }, [amountText, offeringId, openSnap]);

  const purchaseId = purchase?.id;
  const resume = useCallback(() => {
    if (!purchaseId) return;
    void openSnap(async () => {
      // Backend mengembalikan percobaan aktif dengan token yang sama, atau membuat yang baru.
      const result = await createPurchasePayment(purchaseId);
      if (!result.payment.snapToken) throw new Error("Token pembayaran kosong");
      return { purchase: result.purchase, snapToken: result.payment.snapToken };
    });
  }, [openSnap, purchaseId]);

  const purchaseAmount = purchase?.tokenAmount;
  const startNewOrder = useCallback(() => {
    if (purchaseId) setDismissedPurchaseId(purchaseId);
    setTrackedPurchaseId(null);
    if (purchaseAmount) setAmountText(String(purchaseAmount));
    setAgreed(false);
    refreshAll();
  }, [purchaseAmount, purchaseId, refreshAll]);

  const markExpired = useCallback(() => {
    if (purchaseId) setExpiredPurchaseId(purchaseId);
    refreshAll();
  }, [purchaseId, refreshAll]);

  if (!data && error instanceof ApiError && error.status === 404) {
    return (
      <div className="p-4 md:p-8">
        <section aria-label="Penawaran" className="rounded-xl bg-card px-6 py-10 text-card-foreground">
          <Empty className="border-0 p-0 sm:p-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TrayIcon aria-hidden />
              </EmptyMedia>
              <EmptyTitle className="mt-2">Belum ada penawaran token</EmptyTitle>
              <EmptyDescription>Penawaran muncul di sini setelah dibuka KosBagi.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </section>
      </div>
    );
  }
  if (!data && error) {
    return (
      <div className="p-4 md:p-8">
        <LoadError title="Penawaran gagal dimuat" retrying={isValidating} onRetry={() => void mutate()} />
      </div>
    );
  }
  if (!data || !state) return <OfferingSkeleton />;

  const kycWallet = kycQuery.data?.wallet ?? null;
  const walletAddress = data.investor.walletAddress ?? kycWallet?.address ?? null;
  const wallet: CustodialWalletDto | null = walletAddress
    ? {
        address: walletAddress,
        whitelist: kycWallet?.whitelist ?? {
          status: data.investor.walletReady ? "RECORDED" : "PENDING",
          txHash: null,
        },
      }
    : null;

  const controller: BuyTicketController = {
    state,
    payload: data,
    purchase,
    wallet,
    amountText,
    setAmountText,
    agreed,
    setAgreed,
    paying,
    pay,
    resume,
    startNewOrder,
    markExpired,
  };

  return (
    <div className="grid items-start gap-4 p-4 md:gap-6 md:p-8 xl:grid-cols-[minmax(0,1fr)_432px] xl:gap-x-8">
      <OfferingSummary offering={data.offering} investor={data.investor} className="xl:col-start-1" />
      <BuyTicket
        controller={controller}
        className="xl:sticky xl:top-6 xl:col-start-2 xl:row-span-3 xl:row-start-1 xl:self-start"
      />
      <div className="xl:col-start-1">{documents}</div>
      <div className="xl:col-start-1">{risks}</div>
    </div>
  );
}
