/**
 * Konfigurasi yang boleh sampai ke peramban. Hanya variabel berawalan
 * NEXT_PUBLIC_ yang dibaca di sini; rahasia (server key Midtrans, private key
 * dompet operator) tidak pernah ada di frontend.
 */

/** Alamat server backend KosBagi (tanpa /api). Dipakai klien API mulai progress 2. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Awalan semua endpoint backend, mis. `${API_BASE_URL}/health`. */
export const API_BASE_URL = `${API_URL}/api`;
