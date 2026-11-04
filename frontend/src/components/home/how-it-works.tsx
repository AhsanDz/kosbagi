import { SectionHeading } from "@/components/public/section-heading";
import { StepList, type Step } from "@/components/public/step-list";

const steps: Step[] = [
  {
    title: "Verifikasi dan beli token",
    description: "Lolos KYC dummy, pilih jumlah token, lalu bayar lewat Midtrans sandbox.",
  },
  {
    title: "Penghuni bayar sewa",
    description: "Lewat VA, QRIS, atau e-wallet. Penghuni tidak dikenai biaya tambahan.",
  },
  {
    title: "Tercatat di blockchain",
    description:
      "Webhook Midtrans memicu recordRent di kontrak KosLedger, lengkap dengan tautan Etherscan.",
  },
  {
    title: "Terima bagi hasil",
    description: "Akhir bulan, sewa bersih dibagi per token dan masuk ke saldo kamu.",
  },
];

/** Bagian "Cara kerja" (tujuan tautan navbar /#cara-kerja). */
export function HowItWorks() {
  return (
    <section
      id="cara-kerja"
      aria-labelledby="judul-cara-kerja"
      className="container-page scroll-mt-20 py-14 lg:py-24"
    >
      <div className="flex flex-col gap-7 lg:gap-14">
        <SectionHeading id="judul-cara-kerja">Cara kerja</SectionHeading>
        <StepList steps={steps} />
      </div>
    </section>
  );
}
