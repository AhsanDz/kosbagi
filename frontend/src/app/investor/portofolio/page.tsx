import type { Metadata } from "next";

import { AppHeader } from "@/components/app-shell/app-header";
import { ContentSkeleton } from "@/components/app-shell/content-skeleton";

export const metadata: Metadata = { title: "Portofolio" };

/**
 * Portofolio investor: token, riwayat transaksi, dan bagi hasil per periode.
 * Progress 1: kerangka memuat sesuai desain app shell; isinya dibangun di progress 3 dan 4.
 */
export default function InvestorPortfolioPage() {
  return (
    <>
      <AppHeader title="Portofolio" description="Token dan bagi hasil kamu" />
      <ContentSkeleton />
    </>
  );
}
