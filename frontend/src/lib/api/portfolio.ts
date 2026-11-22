import { requestBackend } from "@/lib/api/client";
import type { PortfolioPayload, PortfolioSummaryPayload } from "@/lib/api/types";

/** Kunci SWR sekaligus alamat GET ringkasan investor (saldo, kepemilikan, sewa masuk). */
export const PORTFOLIO_SUMMARY_KEY = "/portfolio/summary";

export function fetchPortfolioSummary(): Promise<PortfolioSummaryPayload> {
  return requestBackend<PortfolioSummaryPayload>(PORTFOLIO_SUMMARY_KEY);
}

/** Kunci SWR sekaligus alamat GET portofolio (bagi hasil per periode dan riwayat transaksi). */
export const PORTFOLIO_KEY = "/portfolio";

export function fetchPortfolio(): Promise<PortfolioPayload> {
  return requestBackend<PortfolioPayload>(PORTFOLIO_KEY);
}
