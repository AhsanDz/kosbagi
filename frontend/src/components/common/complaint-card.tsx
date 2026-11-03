import { EnvelopeSimpleIcon } from "@phosphor-icons/react/ssr";

import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Kartu "Kanal pengaduan" (beranda dan tab Risiko detail kos). */
export function ComplaintCard({
  description = "Kirim pertanyaan atau keluhan. Kami membalas paling lambat 2 hari kerja.",
  className,
}: {
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl bg-card p-5 text-card-foreground sm:p-6",
        className
      )}
    >
      <h3 className="text-h5 font-semibold">Kanal pengaduan</h3>
      <p className="text-sm leading-5 text-muted-foreground">{description}</p>
      <a
        href={`mailto:${siteConfig.complaintEmail}`}
        className="inline-flex items-center gap-2 rounded-sm text-sm leading-5 font-semibold text-foreground underline decoration-1 underline-offset-4 hover:decoration-2"
      >
        <EnvelopeSimpleIcon aria-hidden className="size-4 shrink-0" />
        {siteConfig.complaintEmail}
      </a>
    </div>
  );
}
