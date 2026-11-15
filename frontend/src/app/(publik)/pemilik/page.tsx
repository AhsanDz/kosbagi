import type { Metadata } from "next";
import { CheckIcon, FileTextIcon } from "@phosphor-icons/react/ssr";

import { SectionHeading } from "@/components/public/section-heading";
import { StepList } from "@/components/public/step-list";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { formatPercent, formatRupiah, formatRupiahCompact } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ApplicationForm } from "./application-form";
import { documents, faqs, nextStages, ownerSteps, requirements } from "./content";
import { FundSimulator } from "./fund-simulator";
import { FundsReceipt } from "./funds-receipt";
import { SUMBERSARI_EXAMPLE, simulateFunds } from "./simulation";
import { SimulationDraftProvider } from "./simulation-draft";

export const metadata: Metadata = {
  title: "Untuk pemilik kos",
  description:
    "Jual hak manfaat sebagian kos sebagai token, tetap pegang 30%, dan setiap sewa tercatat on-chain. Prototipe dengan data dummy.",
};

const benefits = [
  {
    value: formatRupiahCompact(simulateFunds(SUMBERSARI_EXAMPLE).fundsReceivedIdr, "short"),
    description: "dana diterima di muka untuk Kos Sumbersari 01, setelah fee 3%",
  },
  {
    value: formatPercent(0.3, 0),
    description: "token tetap milikmu, bagi hasilnya terus masuk tiap bulan",
  },
  {
    value: formatPercent(0.05, 0),
    description: "fee pengelolaan dari sewa kotor; pembukuan dan penagihan diurus KosBagi",
  },
  {
    value: formatRupiah(0),
    description: "biaya tambahan untuk penghuni, mereka membayar sewa seperti biasa",
  },
];

function OwnerHero() {
  return (
    <section aria-labelledby="judul-pemilik" className="container-page pt-8 pb-10 md:pt-14 lg:pb-[108px]">
      <p className="text-sm leading-5 font-semibold text-foreground">
        Untuk pemilik kos di sekitar kampus.
      </p>
      <h1
        id="judul-pemilik"
        className="mt-4 font-display text-display-mobile font-black text-foreground uppercase md:mt-7 md:text-[4.5rem] md:leading-[4.25rem] md:tracking-[-0.04em] xl:text-display-hero xl:leading-[6rem]"
      >
        <span className="block">
          Dana <br className="md:hidden" />
          di muka,
        </span>
        <span className="block">
          kos tetap <br className="md:hidden" />
          jalan.
        </span>
      </h1>

      <div className="mt-4 grid gap-4 md:mt-8 md:gap-8 lg:mt-0 lg:grid-cols-[minmax(0,1fr)_430px] lg:gap-0">
        <div className="flex flex-col items-start gap-4 lg:gap-8 lg:pt-10">
          <p className="max-w-[520px] text-lg leading-7 text-muted-foreground">
            Jual hak manfaat sebagian kos sebagai token, tetap pegang 30%, dan setiap sewa tercatat
            on-chain.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <a href="#ajukan">Ajukan kos</a>
            </Button>
            <Button asChild variant="outline">
              <a href="#simulasi">Hitung dana</a>
            </Button>
          </div>
        </div>
        <FundsReceipt className="w-full md:max-w-[400px] lg:mt-[18px] lg:rotate-3 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-6 motion-safe:duration-700" />
      </div>
    </section>
  );
}

function Benefits() {
  return (
    <section aria-label="Manfaat untuk pemilik kos" className="container-page pt-4 pb-10 lg:pt-0 lg:pb-24">
      <dl className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        {benefits.map((benefit, index) => (
          <div
            key={benefit.value}
            className={cn(
              "flex flex-col gap-3 border-t-2 border-foreground pt-7 lg:pr-6",
              index > 0 && "lg:pl-6"
            )}
          >
            <dt className="font-display text-display-section-mobile font-black whitespace-nowrap text-foreground lg:text-display-mobile">
              {benefit.value}
            </dt>
            <dd className="text-sm leading-5 text-muted-foreground">{benefit.description}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function OwnerSteps() {
  return (
    <section aria-labelledby="judul-alur" className="bg-card text-card-foreground">
      <div className="container-page flex flex-col gap-8 py-14 lg:gap-14 lg:py-24">
        <SectionHeading id="judul-alur" className="text-card-foreground">
          Dari pengajuan ke bagi hasil.
        </SectionHeading>
        <StepList
          steps={ownerSteps}
          className="gap-5 md:gap-x-10 [&>li]:min-h-[110px] md:[&>li]:min-h-0"
        />
      </div>
    </section>
  );
}

function RequirementsAndDocuments() {
  return (
    <section aria-label="Syarat kos dan dokumen" className="bg-card text-card-foreground">
      <div className="container-page grid items-start gap-10 py-14 lg:grid-cols-2 lg:gap-20 lg:py-28">
        <div className="flex flex-col gap-6">
          <SectionHeading className="text-card-foreground">Syarat kos</SectionHeading>
          <ul className="flex flex-col gap-6">
            {requirements.map((requirement) => (
              <li key={requirement} className="flex items-start gap-3 text-base leading-6">
                <CheckIcon aria-hidden className="mt-0.5 size-5 shrink-0" />
                {requirement}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-6">
          <SectionHeading className="text-card-foreground">Dokumen</SectionHeading>
          <p className="max-w-[500px] text-base leading-6 text-muted-foreground">
            Siapkan versi dummy untuk prototipe. Jangan mengunggah dokumen atau data pribadi asli.
          </p>
          <ul className="flex flex-col border-b border-border">
            {documents.map((document) => (
              <li
                key={document}
                className="flex items-center gap-3 border-t border-border py-3.5 text-base leading-6"
              >
                <FileTextIcon aria-hidden className="size-5 shrink-0" />
                {document}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function OwnerFaq() {
  return (
    <section
      aria-labelledby="judul-faq"
      className="container-page grid items-start gap-6 py-14 lg:grid-cols-[440px_minmax(0,1fr)] lg:gap-20 lg:py-28"
    >
      <SectionHeading id="judul-faq" className="lg:text-display-page">
        Pertanyaan pemilik kos
      </SectionHeading>
      <Accordion type="single" collapsible defaultValue={faqs[0]?.question}>
        {faqs.map((faq) => (
          <AccordionItem key={faq.question} value={faq.question}>
            {/* Jarak tanya-jawab 12 px (Figma) dibuat dari tombol, karena -mt-3 bawaan isi
                Accordion memotong baris pertama jawaban di dalam induk overflow-hidden. */}
            <AccordionTrigger className="aria-expanded:pb-3">{faq.question}</AccordionTrigger>
            <AccordionContent className="mt-0 h-auto">{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function ApplySection() {
  return (
    <section
      id="ajukan"
      aria-labelledby="judul-ajukan"
      className="container-page grid items-start gap-8 py-14 lg:grid-cols-[minmax(0,1fr)_560px] lg:gap-20 lg:py-28"
    >
      <div className="flex flex-col gap-6">
        <SectionHeading id="judul-ajukan">Ajukan kos kamu.</SectionHeading>
        <p className="max-w-[520px] text-lg leading-7 text-muted-foreground">
          Lima menit untuk mengisi. Belum ada komitmen apa pun sampai hasil penilaian kamu setujui.
        </p>
        <ol className="flex flex-col border-b border-border pt-2">
          {nextStages.map((stage, index) => (
            <li
              key={stage}
              className="flex items-start gap-5 border-t border-border py-4 lg:items-center"
            >
              <span className="font-mono text-sm leading-5 text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1 text-base leading-6 text-foreground">{stage}</span>
            </li>
          ))}
        </ol>
      </div>
      <ApplicationForm />
    </section>
  );
}

/**
 * Halaman untuk pemilik kos (Figma: Publik / Pemilik dan Publik / Pemilik / Ponsel).
 * Beranda menautkan /pemilik#ajukan, jadi id bagian form tidak boleh berubah.
 */
export default function OwnerPage() {
  return (
    <SimulationDraftProvider>
      <OwnerHero />
      <Benefits />
      <OwnerSteps />
      <section
        id="simulasi"
        aria-labelledby="judul-simulasi"
        className="container-page flex flex-col gap-8 py-14 lg:gap-10 lg:py-28"
      >
        <SectionHeading id="judul-simulasi">Hitung dana untuk kos kamu.</SectionHeading>
        <FundSimulator />
      </section>
      <RequirementsAndDocuments />
      <OwnerFaq />
      <ApplySection />
    </SimulationDraftProvider>
  );
}
