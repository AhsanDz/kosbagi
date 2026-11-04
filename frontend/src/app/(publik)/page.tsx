import { FeaturedProperty } from "@/components/home/featured-property";
import { HomeHero } from "@/components/home/home-hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { OnchainProof } from "@/components/home/onchain-proof";
import { OwnerCta } from "@/components/home/owner-cta";
import { RentToPayout } from "@/components/home/rent-to-payout";
import { RiskOverview } from "@/components/home/risk-overview";

/**
 * Beranda (Figma: Publik / Beranda / Desktop, Ponsel, Desktop gelap).
 * Urutan bagian mengikuti desain: hero, kos unggulan, bukti on-chain,
 * cara kerja, alur sewa ke bagi hasil, ajakan pemilik kos, risiko.
 */
export default function HomePage() {
  return (
    <>
      <HomeHero />
      <FeaturedProperty />
      <OnchainProof />
      <HowItWorks />
      <RentToPayout />
      <OwnerCta />
      <RiskOverview />
    </>
  );
}
