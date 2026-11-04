import { FileTextIcon } from "@phosphor-icons/react/ssr";

import { ChainStatus } from "@/components/common/chain-status";
import { Button } from "@/components/ui/button";
import { propertyDocuments } from "@/lib/data/documents";

/**
 * Tab Dokumen: daftar dokumen properti beserta status hash-nya di KosToken.
 * Di progress 1 file dummy belum disajikan, jadi tombol Unduh dinonaktifkan.
 */
export function DocumentsTab() {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-2">
        <h2 className="text-h3 font-semibold text-foreground">Dokumen properti</h2>
        <p className="max-w-[680px] text-base leading-6 text-muted-foreground">
          File dokumen tidak diunggah ke blockchain. Hash SHA-256 setiap dokumen dicatat di kontrak
          KosToken saat penerbitan, jadi isinya bisa dicocokkan siapa pun.
        </p>
      </section>

      <div className="flex flex-col gap-3">
        <ul className="flex flex-col border-b border-border">
          {propertyDocuments.map((document) => (
            <li
              key={document.title}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border py-5"
            >
              <FileTextIcon aria-hidden className="size-6 shrink-0 text-foreground" />
              <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1">
                <h3 className="text-base leading-6 font-medium text-foreground">{document.title}</h3>
                <p className="text-xs leading-4 text-muted-foreground">{document.fileInfo}</p>
              </div>
              <div className="flex items-center gap-4 max-sm:w-full max-sm:justify-between max-sm:pl-10">
                <ChainStatus status={document.chainStatus} txHash={document.txHash} />
                <Button variant="outline" disabled aria-describedby="catatan-unduh">
                  Unduh<span className="sr-only"> {document.title}</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <p id="catatan-unduh" className="text-xs leading-4 text-muted-foreground">
          File dokumen dummy bisa diunduh setelah API properti tersedia.
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-card p-5 text-card-foreground">
        <h3 className="text-h5 font-semibold">Cara mencocokkan dokumen</h3>
        <p className="max-w-[640px] text-sm leading-5 text-muted-foreground">
          Unduh file, hitung SHA-256-nya (mis. sha256sum di terminal), lalu bandingkan dengan hash
          yang tercatat di Etherscan. Bila sama, file tidak diubah sejak penerbitan.
        </p>
      </div>
    </div>
  );
}
