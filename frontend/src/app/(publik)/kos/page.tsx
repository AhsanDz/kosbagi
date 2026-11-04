import type { Metadata } from "next";
import Link from "next/link";
import { TrayIcon } from "@phosphor-icons/react/ssr";

import { PropertyCardVertical } from "@/components/property/property-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getOffering } from "@/lib/data/offering";
import { properties } from "@/lib/data/properties";

export const metadata: Metadata = {
  title: "Daftar kos",
  description:
    "Kos yang dibuka untuk penawaran token. Setiap kos punya kontrak sendiri di Ethereum Sepolia.",
};

/**
 * Daftar kos (Figma: Publik / Daftar kos): satu kartu Kos Sumbersari 01 dan
 * empty state jujur "Properti berikutnya sedang dinilai" (tanpa kos fiktif).
 */
export default function PropertyListPage() {
  const listings = properties.flatMap((property) => {
    const offering = getOffering(property.slug);
    return offering ? [{ property, offering }] : [];
  });

  return (
    <>
      <div className="container-page flex flex-col gap-4 pt-10 pb-8 lg:pt-16 lg:pb-10">
        <h1 className="font-display text-display-section-mobile font-black text-foreground uppercase md:text-display-page">
          Daftar kos
        </h1>
        <p className="max-w-[640px] text-base leading-6 text-muted-foreground md:text-lg md:leading-7">
          Kos yang dibuka untuk penawaran token. Setiap kos punya kontrak sendiri di Ethereum
          Sepolia.
        </p>
        <p className="flex flex-wrap gap-x-6 gap-y-1 pt-2 text-sm leading-5">
          <span className="font-semibold text-foreground">{listings.length} kos dibuka</span>
          <span className="text-muted-foreground">Diurutkan: penawaran terbaru</span>
        </p>
      </div>

      <div className="container-page grid gap-6 pb-20 md:grid-cols-[minmax(0,384px)_minmax(0,1fr)] lg:pb-30">
        <ul className="flex flex-col gap-6">
          {listings.map(({ property, offering }) => (
            <li key={property.slug}>
              <PropertyCardVertical property={property} offering={offering} />
            </li>
          ))}
        </ul>
        <Empty className="min-h-[360px] md:min-h-0">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TrayIcon aria-hidden />
            </EmptyMedia>
            <EmptyTitle>Properti berikutnya sedang dinilai</EmptyTitle>
            <EmptyDescription>
              Kos baru muncul di sini setelah sertifikatnya diverifikasi dan nilainya dinilai. Untuk
              prototipe ini, hanya Kos Sumbersari 01 yang dibuka.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild variant="outline" size="sm">
              <Link href="/#cara-kerja">Lihat cara kerja</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    </>
  );
}
