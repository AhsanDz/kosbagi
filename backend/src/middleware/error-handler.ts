// Penangan error terakhir di rantai middleware. Semua error, dari mana pun asalnya,
// dibalas dengan format JSON yang sama:
//   { "error": { "code": "NOT_FOUND", "message": "...", "details": [...], "requestId": "..." } }
// Detail teknis (stack trace, pesan internal) hanya masuk log server, tidak ke klien.
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { z } from '../lib/zod.js';

/** Dipasang setelah semua router: permintaan yang tidak cocok dengan rute mana pun. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `Rute ${req.method} ${req.path} tidak ditemukan.`));
};

/**
 * Error 4xx yang memang disebabkan permintaan klien: error body-parser (express.json) yang
 * membawa `type` berupa teks, mis. entity.parse.failed, atau error http-errors yang ditandai
 * `expose: true`. Objek lain yang kebetulan punya `status` 4xx, mis. balasan 401 dari layanan
 * luar seperti Midtrans, bukan kesalahan klien: diperlakukan sebagai error server (500) dan dicatat.
 */
function isClientHttpError(error: unknown): error is { status: number; type?: string } {
  if (typeof error !== 'object' || error === null) return false;
  const { status, type, expose } = error as { status?: unknown; type?: unknown; expose?: unknown };
  return (
    typeof status === 'number' && status >= 400 && status < 500 && (typeof type === 'string' || expose === true)
  );
}

/** Menerjemahkan error apa pun menjadi AppError yang aman dikirim ke klien. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  // Validasi input dengan zod: schema.parse(req.body) melempar ZodError.
  if (error instanceof z.ZodError) {
    const details = error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
    return new AppError(400, 'VALIDATION_ERROR', 'Data yang dikirim tidak valid.', details);
  }

  if (isClientHttpError(error)) {
    switch (error.type) {
      case 'entity.parse.failed':
        return new AppError(400, 'INVALID_JSON', 'Body permintaan bukan JSON yang valid.');
      case 'entity.too.large':
        return new AppError(413, 'PAYLOAD_TOO_LARGE', 'Ukuran body permintaan melebihi batas yang diizinkan.');
      default:
        return new AppError(error.status, 'BAD_REQUEST', 'Permintaan tidak dapat diproses.');
    }
  }

  return new AppError(500, 'INTERNAL_ERROR', 'Terjadi kesalahan pada server. Silakan coba lagi.');
}

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  const appError = toAppError(error);

  if (appError.status >= 500) {
    req.log.error({ err: error }, 'Kesalahan tak terduga saat memproses permintaan');
  }

  // Bila sebagian respons sudah terkirim, serahkan ke penangan bawaan Express (menutup koneksi).
  if (res.headersSent) {
    next(error);
    return;
  }

  res.status(appError.status).json({
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details === undefined ? {} : { details: appError.details }),
      requestId: String(req.id),
    },
  });
};
