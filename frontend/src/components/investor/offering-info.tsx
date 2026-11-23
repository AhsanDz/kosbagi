import { FileTextIcon } from "@phosphor-icons/react/ssr";

import { TextLink } from "@/components/common/text-link";
import { propertyDocuments } from "@/lib/data/documents";
import { kosSumbersari01 } from "@/lib/data/properties";
import { risks } from "@/lib/data/risks";
import { etherscanAddressUrl, shortenHash } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Dokumen tercatat di KosToken (Figma: kartu "Dokumen" di Investor / Penawaran).
 * Hanya hash yang dicatat on-chain; dokumennya sendiri dummy. Daftarnya sama
 * dengan tab Dokumen di halaman properti: tiga dokumen penerbitan dengan hash
 * SHA-256 final dari docs/bisnis/dokumen-penerbitan.
 */
export function OfferingDocuments({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="judul-dokumen-token"
      className={cn(
        "flex flex-col gap-3.5 rounded-xl bg-card px-5 py-7 text-card-foreground md:px-8",
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 id="judul-dokumen-token" className="text-h5 font-semibold">
          Dokumen tercatat di KosToken
        </h2>
        <p className="text-sm leading-5 text-muted-foreground">
          Hash dokumen disimpan saat token diterbitkan, jadi perubahan dokumen bisa ketahuan.
          Dokumennya sendiri dummy.
        </p>
      </div>
      <ul className="flex flex-col">
        {propertyDocuments.map((document) => (
          <li
            key={document.fileName}
            className="flex items-center gap-2.5 border-t border-border py-2.5 text-sm leading-5"
          >
            <FileTextIcon aria-hidden className="size-[18px] shrink-0" />
            <span className="min-w-0 flex-1">{document.title}</span>
            <span className="font-mono whitespace-nowrap" title={document.contentHash}>
              <span className="sr-only">Hash </span>
              {shortenHash(document.contentHash)}
            </span>
          </li>
        ))}
      </ul>
      <TextLink href={etherscanAddressUrl(kosSumbersari01.contracts.kosToken)} external className="self-start">
        Lihat kontrak KosToken di Etherscan
      </TextLink>
    </section>
  );
}

/** Ringkasan risiko (Figma: kartu "Ringkasan risiko"). Isinya sama dengan beranda. */
export function OfferingRisks({ className }: { className?: string }) {
  return (
    <section
      aria-labelledby="judul-risiko-penawaran"
      className={cn(
        "flex flex-col rounded-xl bg-card px-5 py-7 text-card-foreground md:px-8",
        className
      )}
    >
      <div className="flex flex-col gap-1 pb-2">
        <h2 id="judul-risiko-penawaran" className="text-h5 font-semibold">
          Ringkasan risiko
        </h2>
        <p className="text-sm leading-5 text-muted-foreground">
          Baca sebelum membeli. Persetujuanmu dicentang di tiket beli.
        </p>
      </div>
      <ul className="flex flex-col">
        {risks.map((risk) => (
          <li
            key={risk.title}
            className="flex flex-col gap-0.5 border-t border-border py-3 text-sm leading-5"
          >
            <h3 className="font-semibold">{risk.title}</h3>
            <p className="text-muted-foreground">{risk.summary}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
