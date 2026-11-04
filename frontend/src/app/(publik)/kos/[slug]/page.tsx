import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { OfferingPanel } from "@/components/property/offering-panel";
import { PropertyHeader } from "@/components/property/property-header";
import { PropertyTabs } from "@/components/property/property-tabs";
import { BlockchainTab } from "@/components/property/tabs/blockchain-tab";
import { DocumentsTab } from "@/components/property/tabs/documents-tab";
import { FinanceTab } from "@/components/property/tabs/finance-tab";
import { OverviewTab } from "@/components/property/tabs/overview-tab";
import { RisksTab } from "@/components/property/tabs/risks-tab";
import { Skeleton } from "@/components/ui/skeleton";
import { getOffering } from "@/lib/data/offering";
import { getPropertyBySlug, properties } from "@/lib/data/properties";
import {
  DEFAULT_PROPERTY_TAB,
  parsePropertyTab,
  type PropertyTab,
} from "@/lib/property-tabs";

/** Prarender detail untuk setiap kos yang dikenal (saat ini: sumbersari-01). */
export function generateStaticParams() {
  return properties.map((property) => ({ slug: property.slug }));
}

export async function generateMetadata({ params }: PageProps<"/kos/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);
  if (!property) return { title: "Kos tidak ditemukan" };
  return {
    title: property.name,
    description: `Penawaran token ${property.tokenSymbol}: ${property.roomLabel} dekat UB. Ringkasan, keuangan, dokumen, catatan blockchain, dan risiko.`,
  };
}

/**
 * Membaca ?tab= dari URL. Karena searchParams baru diketahui saat ada
 * permintaan, bagian ini dibungkus <Suspense>; sisa halaman tetap diprarender.
 */
async function TabsFromUrl({
  searchParams,
  panels,
}: {
  searchParams: PageProps<"/kos/[slug]">["searchParams"];
  panels: Record<PropertyTab, ReactNode>;
}) {
  const { tab } = await searchParams;
  const initialTab = parsePropertyTab(tab);
  return <PropertyTabs key={initialTab} initialTab={initialTab} panels={panels} />;
}

/**
 * Isi detail kos. Membaca params, jadi dibungkus <Suspense> di halaman supaya
 * navigasi ke halaman ini langsung menampilkan kerangka (instant navigation).
 * Untuk sumbersari-01 isinya tetap diprarender karena slug-nya sudah dikenal.
 */
async function PropertyDetail({
  params,
  searchParams,
}: Pick<PageProps<"/kos/[slug]">, "params" | "searchParams">) {
  const { slug } = await params;
  const property = getPropertyBySlug(slug);
  const offering = property ? getOffering(property.slug) : undefined;
  if (!property || !offering) notFound();

  const panels: Record<PropertyTab, ReactNode> = {
    ringkasan: <OverviewTab property={property} />,
    keuangan: <FinanceTab />,
    dokumen: <DocumentsTab />,
    blockchain: <BlockchainTab property={property} />,
    risiko: <RisksTab property={property} />,
  };

  return (
    <>
      <PropertyHeader property={property} />
      <div className="container-page grid items-start gap-10 pt-4 pb-20 lg:grid-cols-[minmax(0,1fr)_400px] lg:pb-30">
        <aside className="lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1">
          <OfferingPanel property={property} offering={offering} />
        </aside>
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Suspense fallback={<PropertyTabs initialTab={DEFAULT_PROPERTY_TAB} panels={panels} />}>
            <TabsFromUrl searchParams={searchParams} panels={panels} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

/** Kerangka sementara saat isi detail kos dimuat. */
function PropertyDetailFallback() {
  return (
    <div aria-busy="true" className="container-page flex flex-col gap-5 py-6 lg:py-8">
      <span className="sr-only">Memuat detail kos</span>
      <Skeleton className="h-5 w-56" />
      <Skeleton className="h-12 w-full max-w-[616px]" />
      <Skeleton className="h-5 w-full max-w-[480px]" />
      <Skeleton className="h-56 w-full rounded-2xl sm:h-72 lg:h-[420px]" />
    </div>
  );
}

export default function PropertyDetailPage({ params, searchParams }: PageProps<"/kos/[slug]">) {
  return (
    <Suspense fallback={<PropertyDetailFallback />}>
      <PropertyDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}
