import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Isi halaman 404: menjelaskan apa yang terjadi lalu memberi jalan keluar. */
export function NotFoundContent() {
  return (
    <div className="container-page flex flex-col items-start gap-5 py-20 lg:py-28">
      <p className="font-mono text-sm leading-5 text-muted-foreground">404</p>
      <h1 className="font-display text-display-section-mobile font-black text-foreground uppercase md:text-display-page">
        Halaman tidak ditemukan
      </h1>
      <p className="max-w-[560px] text-base leading-6 text-muted-foreground md:text-lg md:leading-7">
        Alamatnya salah, atau halamannya baru dibangun di progress berikutnya. Kembali ke beranda
        atau buka daftar kos.
      </p>
      <div className="flex flex-wrap gap-3 pt-2">
        <Button asChild>
          <Link href="/">Ke beranda</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/kos">Lihat daftar kos</Link>
        </Button>
      </div>
    </div>
  );
}
