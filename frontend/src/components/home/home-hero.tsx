import Link from "next/link";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/ssr";

import { BillStatusBadge } from "@/components/common/bill-status-badge";
import { HashLink } from "@/components/common/hash-link";
import { InvestorPhoneMockup } from "@/components/home/investor-phone-mockup";
import { Button } from "@/components/ui/button";
import { featuredReceipt } from "@/lib/data/transactions";
import { kosSumbersari01 } from "@/lib/data/properties";
import { etherscanAddressUrl } from "@/lib/format";

/**
 * Hero beranda (Figma: Publik / Beranda, bagian Hero): judul raksasa Archivo,
 * dua tombol, dan mockup ponsel investor dengan kuitansi yang melayang.
 * Maksimal empat elemen teks: pengantar, catatan, judul, tombol.
 */
export function HomeHero() {
  const property = kosSumbersari01;

  return (
    <section aria-labelledby="judul-beranda" className="container-page pt-6 pb-12 md:pt-12 md:pb-20">
      <div className="grid gap-10 lg:min-h-[620px] lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col">
          <p className="max-w-[300px] text-sm leading-5 text-foreground lg:max-w-[272px]">
            Token hak manfaat {property.name}, mulai Rp100.000. Setiap pembayaran sewa tercatat di
            Ethereum Sepolia.
          </p>
          <p className="mt-3 text-xs leading-4 text-muted-foreground">
            Prototipe tugas akhir. Semua data dummy.
          </p>
          <h1
            id="judul-beranda"
            className="mt-5 font-display text-display-mobile font-black text-foreground uppercase md:mt-12 md:text-[4.5rem] md:leading-[4.25rem] md:tracking-[-0.04em] lg:mt-[62px] xl:text-display-hero xl:leading-[6rem]"
          >
            Sewa kos jadi bagi hasil.
          </h1>
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:gap-3 md:mt-12">
            <Button asChild>
              <Link href={`/kos/${property.slug}`}>Lihat {property.name}</Link>
            </Button>
            <Button asChild variant="outline">
              <a
                href={etherscanAddressUrl(property.contracts.kosLedger)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Cek di Etherscan
                <ArrowSquareOutIcon aria-hidden data-icon="inline-end" />
                <span className="sr-only">(membuka tab baru)</span>
              </a>
            </Button>
          </div>
        </div>

        <div className="relative justify-self-end lg:pt-2.5">
          <InvestorPhoneMockup className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 motion-safe:duration-700" />
          <div className="absolute top-[400px] -left-[94px] flex flex-col gap-1 rounded-[18px] bg-card px-3.5 py-3 text-card-foreground shadow-float motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:delay-300 motion-safe:duration-700 motion-safe:fill-mode-backwards lg:top-[470px] lg:-left-[140px] lg:gap-1.5 lg:rounded-xl lg:px-4 lg:py-3.5">
            <div className="flex items-center gap-2 lg:gap-2.5">
              <p className="text-sm leading-5 font-semibold">
                Sewa {featuredReceipt.room}
                <span className="hidden lg:inline">, November</span>
              </p>
              <BillStatusBadge status="PAID" />
            </div>
            <p className="flex items-center gap-1.5 text-xs leading-4">
              <span className="hidden text-muted-foreground lg:inline">Tercatat</span>
              <HashLink
                hash={featuredReceipt.txHash}
                label={`Transaksi sewa ${featuredReceipt.room}`}
                className="text-foreground"
              />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
