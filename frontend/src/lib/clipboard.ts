import { toast } from "sonner";

/**
 * Menyalin teks ke papan klip dan memberi tahu hasilnya lewat toast. Dipakai
 * tombol Salin nomor tagihan dan Salin hash.
 */
export async function copyToClipboard(text: string, successMessage: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("Teks belum tersalin. Pilih dan salin manual.");
  }
}
