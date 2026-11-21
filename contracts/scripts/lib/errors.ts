/**
 * Kesalahan konfigurasi atau masukan yang pesannya sudah menjelaskan cara
 * memperbaikinya (alamat salah, file dokumen tidak ada, profil build salah).
 * Skrip mencetak pesannya saja, tanpa stack trace.
 */
export class ConfigError extends Error {
  override name = "ConfigError";
}
