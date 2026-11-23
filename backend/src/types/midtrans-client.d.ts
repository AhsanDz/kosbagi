// Paket midtrans-client tidak menyertakan tipe. Hanya bagian yang dipakai KosBagi yang ditulis di sini.
declare module 'midtrans-client' {
  export class Snap {
    constructor(options: { isProduction: boolean; serverKey: string });
    createTransaction(parameter: object): Promise<{ token: string; redirect_url: string }>;
    transaction: {
      status(orderId: string): Promise<unknown>;
    };
    httpClient: {
      /** Instance axios internal; dipakai untuk memasang batas waktu. */
      http_client: { defaults: { timeout: number } };
    };
  }

  /** Core API. Di KosBagi hanya dipakai skrip demo:bayar-sewa untuk membuat virtual account. */
  export class CoreApi {
    constructor(options: { isProduction: boolean; serverKey: string });
    charge(parameter: object): Promise<unknown>;
    httpClient: {
      http_client: { defaults: { timeout: number } };
    };
  }

  export class MidtransError extends Error {
    /** Bisa berupa angka, teks dari body respons, atau null bila koneksi gagal. */
    httpStatusCode: number | string | null;
    ApiResponse: { error_messages?: string[] } | null;
  }

  const midtransClient: { Snap: typeof Snap; CoreApi: typeof CoreApi; MidtransError: typeof MidtransError };
  export default midtransClient;
}
