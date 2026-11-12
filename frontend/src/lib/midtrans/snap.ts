import { MIDTRANS_SNAP_URL } from "@/lib/config";

/** Hasil callback Snap. Tidak dipercaya: hanya memicu pemeriksaan ulang ke backend. */
export interface SnapResult {
  order_id?: string;
  transaction_status?: string;
  status_code?: string;
  status_message?: string;
}

export interface SnapCallbacks {
  onSuccess?: (result: SnapResult) => void;
  onPending?: (result: SnapResult) => void;
  onError?: (result: SnapResult) => void;
  onClose?: () => void;
}

export interface Snap {
  pay: (token: string, callbacks?: SnapCallbacks) => void;
}

declare global {
  interface Window {
    snap?: Snap;
  }
}

let snapLoader: Promise<Snap> | null = null;

/**
 * Memuat snap.js sandbox saat pertama dibutuhkan. Skrip pihak ketiga ini hanya
 * dipakai saat penghuni menekan tombol bayar, jadi tidak ikut membebani halaman.
 * Bila gagal, percobaan berikutnya memuat ulang dari awal.
 */
export function loadSnap(clientKey: string): Promise<Snap> {
  if (window.snap) return Promise.resolve(window.snap);

  snapLoader ??= new Promise<Snap>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = MIDTRANS_SNAP_URL;
    script.async = true;
    script.dataset.clientKey = clientKey;
    script.onload = () => {
      if (window.snap) resolve(window.snap);
      else reject(new Error("snap.js dimuat tanpa objek window.snap"));
    };
    script.onerror = () => {
      script.remove();
      reject(new Error("snap.js gagal dimuat"));
    };
    document.body.append(script);
  }).catch((error: unknown) => {
    snapLoader = null;
    throw error;
  });

  return snapLoader;
}
