// Klien HTTP kecil untuk skrip demo (P4): login akun dummy lalu memanggil API sungguhan, sama
// seperti frontend. Dengan begitu persetujuan KYC dan pencatatan biaya oleh skrip melewati
// autentikasi, peran, validasi, dan aturan yang sama dengan klik di layar.

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown };
}

async function parse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const body = text ? (JSON.parse(text) as { data?: T } & ApiErrorBody) : {};
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body.error?.code ?? `HTTP_${response.status}`,
      body.error?.message ?? `HTTP ${response.status}`,
      body.error?.details,
    );
  }
  return body.data as T;
}

export interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  /** Unggahan multipart/form-data, mis. nota biaya. */
  upload<T>(path: string, form: FormData): Promise<T>;
}

/** `baseUrl` mis. http://localhost:4000. Path diawali /api. */
export function apiClient(baseUrl: string, token?: string): ApiClient {
  const headers = (extra: Record<string, string> = {}) => ({ ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra });
  const url = (path: string) => new URL(path, baseUrl).toString();
  return {
    async get(path) {
      return parse(await fetch(url(path), { headers: headers() }));
    },
    async post(path, body) {
      return parse(
        await fetch(url(path), {
          method: 'POST',
          headers: headers(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        }),
      );
    },
    async upload(path, form) {
      return parse(await fetch(url(path), { method: 'POST', headers: headers(), body: form }));
    },
  };
}

/** Batas tunggu Retry-After yang masih masuk akal untuk skrip (batas login 10 per menit). */
const MAX_RETRY_AFTER_SECONDS = 90;

/** Detik dari header Retry-After, atau 60 bila tidak ada. */
export function retryAfterSeconds(header: string | null): number {
  const seconds = Number(header);
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(Math.ceil(seconds), MAX_RETRY_AFTER_SECONDS) : 60;
}

async function postLogin(baseUrl: string, email: string, password: string): Promise<Response> {
  return fetch(new URL('/api/auth/login', baseUrl).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Login akun dummy dan mengembalikan klien bertoken. Login dibatasi 10 kali per menit per IP; bila
 * kena batas (429), skrip menunggu sesuai header Retry-After sekali, lalu mencoba lagi.
 */
export async function login(
  baseUrl: string,
  email: string,
  password: string,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<ApiClient & { userId: string; name: string }> {
  let response = await postLogin(baseUrl, email, password);
  if (response.status === 429) {
    const seconds = retryAfterSeconds(response.headers.get('retry-after'));
    console.log(`   Batas login tercapai; menunggu ${seconds} detik lalu mencoba lagi...`);
    await wait(seconds * 1_000);
    response = await postLogin(baseUrl, email, password);
  }
  const data = await parse<{ token: string; user: { id: string; name: string } }>(response);
  return { ...apiClient(baseUrl, data.token), userId: data.user.id, name: data.user.name };
}

/** Memastikan server API bisa dihubungi. Melempar Error berpesan jelas bila tidak. */
export async function ensureServer(baseUrl: string): Promise<void> {
  const healthUrl = new URL('/api/health', baseUrl).toString();
  try {
    const health = await fetch(healthUrl);
    if (!health.ok) throw new Error(`HTTP ${health.status}`);
  } catch {
    throw new Error(`server API tidak bisa dihubungi di ${healthUrl}. Jalankan npm run dev di terminal lain, lalu ulangi.`);
  }
}
