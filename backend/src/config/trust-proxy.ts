// Membaca TRUST_PROXY: proxy mana yang boleh dipercaya saat Express membaca IP klien dari header
// X-Forwarded-For. IP itu dipakai rate limit per IP (login, form pemilik, webhook Midtrans).
//
// Bentuk yang diterima:
//   loopback                  bawaan: hanya proxy di laptop yang sama (ngrok, server Next.js lokal)
//   1, 2, ...                 jumlah proxy di depan server, mis. 1 untuk Railway
//   10.0.0.0/8, loopback      daftar alamat atau rentang proxy, dipisah koma
//   false atau 0              tidak memercayai proxy: IP klien = alamat koneksi TCP
//
// `true` sengaja ditolak. Nilai itu memercayai seluruh isi X-Forwarded-For, sehingga siapa pun bisa
// mengaku sebagai IP lain dan lolos dari rate limit.
import { isIP } from 'node:net';

/** Nilai yang langsung bisa diberikan ke app.set('trust proxy', ...). */
export type TrustProxySetting = false | number | readonly string[];

/** Nama rentang bawaan Express (paket proxy-addr). */
const PRESETS = new Set(['loopback', 'linklocal', 'uniquelocal']);

/** Jumlah proxy terbesar yang masuk akal untuk prototipe; lebih dari ini hampir pasti salah ketik. */
const MAX_HOPS = 10;

export class TrustProxyError extends Error {}

function isAddressOrRange(entry: string): boolean {
  if (PRESETS.has(entry)) return true;
  const [address = '', prefix, ...rest] = entry.split('/');
  const version = isIP(address);
  if (version === 0 || rest.length > 0) return false;
  if (prefix === undefined) return true;
  if (!/^\d{1,3}$/.test(prefix)) return false;
  return Number(prefix) <= (version === 4 ? 32 : 128);
}

/**
 * Mengubah teks TRUST_PROXY menjadi nilai untuk Express. Melempar TrustProxyError berisi alasan
 * berbahasa Indonesia bila tidak valid.
 */
export function parseTrustProxy(raw: string): TrustProxySetting {
  const value = raw.trim().toLowerCase();
  if (value === 'false' || value === '0') return false;
  if (value === 'true') {
    throw new TrustProxyError(
      'true terlalu longgar: klien bisa memalsukan IP lewat X-Forwarded-For. Isi jumlah proxy (mis. 1) atau alamat proxy',
    );
  }
  if (/^\d+$/.test(value)) {
    const hops = Number(value);
    if (hops > MAX_HOPS) throw new TrustProxyError(`jumlah proxy paling banyak ${MAX_HOPS}`);
    return hops;
  }

  const entries = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  if (entries.length === 0) throw new TrustProxyError('tidak boleh kosong');
  const invalid = entries.filter((entry) => !isAddressOrRange(entry));
  if (invalid.length > 0) {
    throw new TrustProxyError(
      `${invalid.join(', ')} bukan alamat IP, rentang CIDR, atau salah satu dari loopback, linklocal, uniquelocal`,
    );
  }
  return Object.freeze(entries);
}

/** Dipakai bila TRUST_PROXY tidak diisi: hanya proxy di mesin yang sama (ngrok dan Next.js lokal). */
export const LOCAL_TRUST_PROXY: TrustProxySetting = Object.freeze(['loopback']);
