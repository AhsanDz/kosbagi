import Image from "next/image";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { BedIcon, GraduationCapIcon, MapPinIcon } from "@phosphor-icons/react/ssr";

import { IllustrationLabel } from "@/components/common/illustration-label";
import { OfferingProgress } from "@/components/common/offering-progress";
import { TextLink } from "@/components/common/text-link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatNumber, formatPercent, formatRupiah } from "@/lib/format";
import type { Offering, Property } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PropertyCardProps {
  property: Property;
  offering: Offering;
  className?: string;
}

function detailHref(property: Property) {
  return `/kos/${property.slug}`;
}

function Fact({ label, value, size = "md" }: { label: string; value: string; size?: "md" | "sm" }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs leading-4 text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-card-foreground tabular-nums",
          size === "md" ? "text-number-md font-semibold" : "text-base leading-6 font-medium"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function LocationItem({ icon: ItemIcon, children }: { icon: Icon; children: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <ItemIcon aria-hidden className="size-4 shrink-0" />
      {children}
    </li>
  );
}

/**
 * Kartu kos horizontal (Figma: "Kartu kos", Tata letak=Horizontal):
 * kos unggulan di beranda. Panel 28 px, foto berradius 20 (= 28 - padding 8).
 */
export function PropertyCardHorizontal({ property, offering, className }: PropertyCardProps) {
  return (
    <article
      className={cn(
        "flex items-center gap-10 rounded-2xl bg-card p-2 pr-10 text-card-foreground xl:gap-14 xl:pr-12",
        className
      )}
    >
      <div className="relative aspect-[560/440] w-[46%] shrink-0 overflow-hidden rounded-xl xl:w-[560px]">
        <Image
          src={property.photo.src}
          alt={property.photo.alt}
          fill
          sizes="(min-width: 1280px) 560px, 46vw"
          className="object-cover"
        />
        <IllustrationLabel />
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-start gap-6 py-6">
        <Badge variant="outline">Penawaran dibuka sampai {formatDate(offering.closesAt)}</Badge>
        <h3 className="font-display text-[2.75rem] leading-[2.625rem] font-black tracking-[-0.03em] text-balance uppercase xl:text-display-page">
          {property.name}
        </h3>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm leading-5 text-muted-foreground">
          <LocationItem icon={MapPinIcon}>{property.address}</LocationItem>
          <LocationItem icon={GraduationCapIcon}>±8 menit jalan kaki ke UB</LocationItem>
          <LocationItem icon={BedIcon}>{`${property.roomCount} kamar`}</LocationItem>
        </ul>
        <dl className="flex flex-wrap gap-x-10 gap-y-4">
          <Fact label="Per token" value={formatRupiah(property.tokenPriceIdr)} />
          <Fact
            label="Estimasi bagi hasil"
            value={`±${formatPercent(offering.estimatedAnnualYield)}/tahun`}
          />
          <Fact
            label="Batas per investor"
            value={`${formatNumber(property.maxTokensPerInvestor)} token`}
          />
        </dl>
        <OfferingProgress offering={offering} className="max-w-[536px]" />
        <div className="flex flex-wrap items-center gap-5">
          <Button asChild>
            <Link href={detailHref(property)}>Lihat detail kos</Link>
          </Button>
          <TextLink href="/kos">Semua kos</TextLink>
        </div>
      </div>
    </article>
  );
}

/**
 * Kartu kos vertikal (Figma: "Kartu kos", Tata letak=Vertikal):
 * dipakai di /kos dan kos unggulan versi ponsel. Foto di atas, status di bawah foto.
 */
export function PropertyCardVertical({ property, offering, className }: PropertyCardProps) {
  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-xl bg-card text-card-foreground",
        className
      )}
    >
      <div className="relative h-62 w-full shrink-0">
        <Image
          src={property.photo.src}
          alt={property.photo.alt}
          fill
          sizes="(min-width: 768px) 384px, 100vw"
          className="object-cover"
        />
        <IllustrationLabel />
      </div>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-h4 font-semibold">{property.name}</h3>
          <Badge variant="outline">Dibuka</Badge>
        </div>
        <p className="flex items-center gap-1.5 text-xs leading-4 text-muted-foreground">
          <MapPinIcon aria-hidden className="size-3.5 shrink-0" />
          Sumbersari, Malang · {property.roomCount} kamar
        </p>
        <dl className="grid grid-cols-2 gap-6">
          <Fact label="Per token" value={formatRupiah(property.tokenPriceIdr)} size="sm" />
          <Fact
            label="Estimasi bagi hasil"
            value={`±${formatPercent(offering.estimatedAnnualYield)} per tahun`}
            size="sm"
          />
        </dl>
        <OfferingProgress offering={offering} />
        <Button asChild className="w-full">
          <Link href={detailHref(property)}>
            Lihat detail<span className="sr-only"> {property.name}</span>
          </Link>
        </Button>
      </div>
    </article>
  );
}
