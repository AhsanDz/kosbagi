import Link from "next/link";

import { Button } from "@/components/ui/button";
import { kosSumbersari01 } from "@/lib/data/properties";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Pengganti Kartu saldo saat investor belum memegang token (Figma: Ringkasan,
 * belum punya token). Kartu terang biasa; Daftar sewa masuk di kanan tetap
 * tampil karena semua sewa tercatat terbuka di Sepolia.
 */
export function NoTokenCard({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="judul-belum-punya-token"
      className={cn(
        "flex min-w-0 flex-col items-start gap-5 rounded-xl bg-card px-6 py-8 text-card-foreground md:px-[34px] md:py-[38px]",
        className
      )}
    >
      <h2 id="judul-belum-punya-token" className="text-h3 font-semibold md:text-h2">
        Kamu belum punya token
      </h2>
      <p className="max-w-[60ch] text-base leading-7 text-muted-foreground">
        Beli token {kosSumbersari01.tokenSymbol} mulai {formatRupiah(kosSumbersari01.tokenPriceIdr)}{" "}
        per token. Bagi hasil dihitung dari saldo tokenmu di blok penutupan setiap periode, lalu
        masuk ke saldo di halaman ini.
      </p>
      <Button asChild>
        <Link href="/investor/penawaran">Lihat penawaran</Link>
      </Button>
      <p className="max-w-[60ch] text-sm leading-5 text-muted-foreground">
        Daftar sewa masuk tetap bisa kamu pantau tanpa memegang token, karena semua tercatat di
        Sepolia.
      </p>
    </section>
  );
}
