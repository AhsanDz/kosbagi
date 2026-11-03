/**
 * Tautan "Langsung ke isi utama" untuk pengguna keyboard dan pembaca layar.
 * Tersembunyi sampai mendapat fokus (tekan Tab sekali setelah halaman dibuka).
 */
export function SkipLink({ targetId = "isi-utama" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      Langsung ke isi utama
    </a>
  );
}
