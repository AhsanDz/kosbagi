"use client";

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import useSWR from "swr";

import {
  BILLS_KEY,
  createBillPayment,
  CURRENT_BILL_KEY,
  fetchBills,
  fetchCurrentBill,
} from "@/lib/api/bills";
import { toApiError } from "@/lib/api/client";
import type { BillDto, TenantRoomDto } from "@/lib/api/types";
import { resolveBillViewState, type BillViewState } from "@/lib/billing";
import { MIDTRANS_CLIENT_KEY } from "@/lib/config";
import { loadSnap } from "@/lib/midtrans/snap";

/** Polling "Memeriksa pembayaran": tiap 3 detik, paling lama 60 detik. */
const CHECK_INTERVAL_MS = 3_000;
const CHECK_TIMEOUT_MS = 60_000;

interface TenantBillingValue {
  status: "loading" | "error" | "ready";
  bill: BillDto | null;
  room: TenantRoomDto | null;
  /** Tagihan lunas, terbaru lebih dulu. */
  paidBills: BillDto[];
  billState: BillViewState | null;
  /** Sedang menyiapkan pembayaran (memuat snap.js atau meminta token). */
  paying: boolean;
  /** Bayar sewa dan Bayar ulang: meminta percobaan ke backend. */
  startPayment: () => Promise<void>;
  /** Lanjutkan pembayaran: membuka Snap dengan token percobaan yang masih aktif. */
  resumePayment: () => Promise<void>;
  /** Dipanggil hitung mundur saat waktu percobaan habis. */
  markPaymentExpired: (paymentId: string) => void;
  retrying: boolean;
  retry: () => void;
}

const TenantBillingContext = createContext<TenantBillingValue | null>(null);

/**
 * Sumber data dan alur bayar halaman penghuni. Dipasang di layout supaya
 * /penghuni dan /penghuni/tagihan berbagi data, polling, dan keadaan klien.
 * Bukti pembayaran hanya berasal dari backend: callback Snap sekadar memicu
 * pemeriksaan ulang, tidak pernah menandai lunas.
 */
export function TenantBillingProvider({ children }: { children: ReactNode }) {
  const [checkingBillId, setCheckingBillId] = useState<string | null>(null);
  const [expiredPaymentId, setExpiredPaymentId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const history = useSWR(BILLS_KEY, fetchBills);
  const { mutate: refreshHistory } = history;

  const current = useSWR(CURRENT_BILL_KEY, fetchCurrentBill, {
    refreshInterval: checkingBillId ? CHECK_INTERVAL_MS : 0,
    onSuccess(data) {
      const bill = data.bill;
      if (bill?.status !== "PAID") return;

      if (checkingBillId === bill.id) {
        setCheckingBillId(null);
        toast.success("Pembayaran terkonfirmasi");
      }
      const historyHasBill = history.data?.bills.some(
        (item) => item.id === bill.id && item.status === "PAID"
      );
      if (!historyHasBill) void refreshHistory();
    },
  });
  const { mutate: refreshCurrent } = current;

  // Webhook bisa saja belum masuk (mis. tanpa ngrok). Polling berhenti, tagihan
  // kembali mengikuti status dari backend, dan penghuni diberi tahu.
  useEffect(() => {
    if (!checkingBillId) return;
    const timer = setTimeout(() => {
      setCheckingBillId(null);
      toast.info("Konfirmasi Midtrans belum masuk", {
        description: "Muat ulang halaman ini beberapa saat lagi untuk melihat statusnya.",
      });
    }, CHECK_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [checkingBillId]);

  const bill = current.data?.bill ?? null;
  const room = current.data?.room ?? null;

  const openSnap = useCallback(
    async (billId: string, getToken: () => Promise<string>) => {
      if (!MIDTRANS_CLIENT_KEY) {
        toast.error("Pembayaran belum bisa dibuka", {
          description: "Client key Midtrans belum diisi di frontend/.env.local.",
        });
        return;
      }

      setPaying(true);
      try {
        const snap = await loadSnap(MIDTRANS_CLIENT_KEY);
        const token = await getToken();
        await refreshCurrent();

        snap.pay(token, {
          onSuccess: () => {
            setCheckingBillId(billId);
            void refreshCurrent();
          },
          onPending: () => void refreshCurrent(),
          onError: () => {
            toast.error("Pembayaran tidak berhasil", {
              description: "Midtrans menolak pembayaran. Tagihan tetap belum dibayar.",
            });
            void refreshCurrent();
          },
          onClose: () => void refreshCurrent(),
        });
      } catch (error) {
        const apiError = toApiError(error);
        toast.error("Pembayaran belum bisa dibuka", {
          description:
            error instanceof Error && !("code" in error)
              ? "Halaman Midtrans gagal dimuat. Periksa koneksi, lalu coba lagi."
              : apiError.message,
        });
        // Mis. BILL_ALREADY_PAID: tampilkan status terbaru dari backend.
        void refreshCurrent();
      } finally {
        setPaying(false);
      }
    },
    [refreshCurrent]
  );

  const startPayment = useCallback(async () => {
    if (!bill) return;
    await openSnap(bill.id, async () => {
      const payment = await createBillPayment(bill.id);
      if (!payment.snapToken) throw new Error("Token pembayaran kosong");
      return payment.snapToken;
    });
  }, [bill, openSnap]);

  const resumePayment = useCallback(async () => {
    if (!bill) return;
    const snapToken = bill.payment?.snapToken;
    if (!snapToken) return startPayment();
    await openSnap(bill.id, async () => snapToken);
  }, [bill, openSnap, startPayment]);

  const markPaymentExpired = useCallback(
    (paymentId: string) => {
      setExpiredPaymentId(paymentId);
      void refreshCurrent();
    },
    [refreshCurrent]
  );

  const retry = useCallback(() => {
    void refreshCurrent();
    void refreshHistory();
  }, [refreshCurrent, refreshHistory]);

  const loadFailed =
    (!current.data && current.error !== undefined) ||
    (!history.data && history.error !== undefined);
  const status = loadFailed ? "error" : current.data && history.data ? "ready" : "loading";
  const checking = checkingBillId !== null && checkingBillId === bill?.id;
  const historyData = history.data;
  const retrying = current.isValidating || history.isValidating;

  const value = useMemo<TenantBillingValue>(
    () => ({
      status,
      bill,
      room,
      paidBills: historyData?.bills.filter((item) => item.status === "PAID") ?? [],
      billState: bill ? resolveBillViewState(bill, { checking, expiredPaymentId }) : null,
      paying,
      startPayment,
      resumePayment,
      markPaymentExpired,
      retrying,
      retry,
    }),
    [
      status,
      bill,
      room,
      historyData,
      checking,
      expiredPaymentId,
      paying,
      startPayment,
      resumePayment,
      markPaymentExpired,
      retrying,
      retry,
    ]
  );

  return <TenantBillingContext value={value}>{children}</TenantBillingContext>;
}

export function useTenantBilling(): TenantBillingValue {
  const value = use(TenantBillingContext);
  if (!value) throw new Error("useTenantBilling harus dipakai di dalam TenantBillingProvider.");
  return value;
}
