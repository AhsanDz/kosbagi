/**
 * Konfigurasi yang boleh sampai ke peramban. Hanya variabel berawalan
 * NEXT_PUBLIC_ yang dibaca di sini; rahasia (server key Midtrans, private key
 * dompet operator) tidak pernah ada di frontend.
 */

/** Alamat server backend KosBagi (tanpa /api). */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Awalan semua endpoint backend, mis. `${API_BASE_URL}/health`. */
export const API_BASE_URL = `${API_URL}/api`;

/**
 * Client key Midtrans sandbox untuk snap.js. Boleh sampai ke peramban. Kosong
 * berarti belum diisi di .env.local: tombol bayar menampilkan pesan yang jelas.
 */
export const MIDTRANS_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";

/** Prototipe hanya sandbox, jadi URL snap.js ditulis tetap. */
export const MIDTRANS_SNAP_URL = "https://app.sandbox.midtrans.com/snap/snap.js";
