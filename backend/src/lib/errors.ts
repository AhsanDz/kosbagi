/**
 * Error yang sengaja dilempar kode aplikasi, mis. data tidak ditemukan atau akses ditolak.
 * Error handler mengubahnya menjadi respons JSON:
 *   { "error": { "code": "...", "message": "...", "details": ... } }
 *
 * Contoh: throw new AppError(404, 'NOT_FOUND', 'Tagihan tidak ditemukan.');
 *
 * - status : kode status HTTP (400-599)
 * - code   : kode mesin berhuruf kapital (bahasa Inggris), dipakai frontend untuk bercabang
 * - message: pesan untuk pengguna (Bahasa Indonesia)
 * - details: data tambahan opsional, mis. daftar field yang tidak valid
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
