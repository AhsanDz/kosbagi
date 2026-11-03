import Image from "next/image";
import Link from "next/link";
import { BedIcon, GraduationCapIcon, MapPinIcon } from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { Property } from "@/lib/types";

/**
 * Kepala detail kos (Figma: Detail kos, bagian Kepala): breadcrumb, nama kos,
 * lokasi, kode token, dan foto ilustrasi dengan keterangan buatan AI.
 */
export function PropertyHeader({ property }: { property: Property }) {
  return (
    <div className="container-page flex flex-col gap-5 py-6 lg:py-8">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/kos">Daftar kos</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{property.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-3.5">
          <h1 className="font-display text-display-section-mobile font-black text-balance text-foreground uppercase md:text-display-page">
            {property.name}
          </h1>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm leading-5 text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <MapPinIcon aria-hidden className="size-4 shrink-0" />
              {property.address}
            </li>
            <li className="flex items-center gap-1.5">
              <GraduationCapIcon aria-hidden className="size-4 shrink-0" />
              {property.campusDistance}
            </li>
            <li className="flex items-center gap-1.5">
              <BedIcon aria-hidden className="size-4 shrink-0" />
              {property.roomLabel}
            </li>
          </ul>
        </div>
        <Badge variant="outline" className="px-3 py-1.5 font-mono text-sm leading-5 font-normal">
          <span className="sr-only">Kode token: </span>
          {property.tokenSymbol}
        </Badge>
      </div>

      <figure className="flex flex-col gap-5">
        <div className="relative h-56 w-full overflow-hidden rounded-2xl sm:h-72 lg:h-[420px]">
          <Image
            src={property.photo.src}
            alt={property.photo.alt}
            fill
            fetchPriority="high"
            sizes="(min-width: 1280px) 1200px, 100vw"
            className="object-cover"
          />
        </div>
        <figcaption className="text-xs leading-4 text-muted-foreground">
          Foto ilustrasi buatan AI, bukan foto properti sebenarnya.
        </figcaption>
      </figure>
    </div>
  );
}
