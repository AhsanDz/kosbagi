import type { Metadata } from "next";

import { AppHeader } from "@/components/app-shell/app-header";
import { PortfolioView } from "@/components/investor/portfolio-view";

export const metadata: Metadata = { title: "Portofolio" };

/**
 * Portofolio investor: kepemilikan token, dompet kustodian, bagi hasil per
 * periode, dan riwayat transaksi beserta bukti on-chain (GET /portfolio).
 */
export default function InvestorPortfolioPage() {
  return (
    <>
      <AppHeader title="Portofolio" description="Token, bagi hasil, dan transaksi milikmu" />
      <PortfolioView />
    </>
  );
}
