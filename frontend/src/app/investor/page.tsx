import type { Metadata } from "next";

import { AppHeader } from "@/components/app-shell/app-header";
import { InvestorHeaderCaption, InvestorOverview } from "@/components/investor/investor-overview";

export const metadata: Metadata = { title: "Ringkasan investor" };

/**
 * Ringkasan investor: saldo bagi hasil dengan grafik sewa tercatat, daftar
 * sewa masuk per kamar, dan kepemilikan token. Datanya dari GET /portfolio/summary.
 */
export default function InvestorOverviewPage() {
  return (
    <>
      <AppHeader title="Ringkasan" description={<InvestorHeaderCaption />} />
      <InvestorOverview />
    </>
  );
}
