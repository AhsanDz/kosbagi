import {
  PropertyCardHorizontal,
  PropertyCardVertical,
} from "@/components/property/property-card";
import { SectionHeading } from "@/components/public/section-heading";
import { getOffering } from "@/lib/data/offering";
import { kosSumbersari01 } from "@/lib/data/properties";

/**
 * Bagian "Kos yang dibuka": kartu kos horizontal di desktop, vertikal di ponsel.
 * Kartu yang tidak sesuai ukuran layar disembunyikan dengan display: none,
 * jadi pembaca layar hanya membaca satu kartu.
 */
export function FeaturedProperty() {
  const property = kosSumbersari01;
  const offering = getOffering(property.slug);
  if (!offering) return null;

  return (
    <section aria-labelledby="kos-dibuka" className="container-page py-14 lg:py-24">
      <div className="flex flex-col gap-5 lg:gap-10">
        <SectionHeading id="kos-dibuka">Kos yang dibuka</SectionHeading>
        <PropertyCardHorizontal property={property} offering={offering} className="hidden lg:flex" />
        <PropertyCardVertical property={property} offering={offering} className="lg:hidden" />
      </div>
    </section>
  );
}
