import type { Metadata } from "next";
import { Suspense } from "react";

import { ReceiptSkeleton } from "@/components/tenant/receipt-states";
import { ReceiptView } from "@/components/tenant/receipt-view";
import { TenantHeader } from "@/components/tenant/tenant-header";

export const metadata: Metadata = { title: "Kuitansi sewa" };

/** Membaca id tagihan dari URL. Dibungkus Suspense karena params baru diketahui saat ada permintaan. */
async function ReceiptFromParams({ params }: Pick<PageProps<"/penghuni/tagihan/[id]">, "params">) {
  const { id } = await params;
  return <ReceiptView billId={id} />;
}

/**
 * Kuitansi sewa satu tagihan lunas: kuitansi untuk penghuni dan panel argumen
 * recordRent yang tercatat di Sepolia. Tombol Cetak kuitansi memakai cetak
 * peramban; stylesheet cetak di globals.css hanya menampilkan kartu kuitansi.
 */
export default function PenghuniReceiptPage({ params }: PageProps<"/penghuni/tagihan/[id]">) {
  return (
    <>
      <TenantHeader title="Kuitansi sewa" />
      <Suspense
        fallback={
          <div className="p-4 md:p-8">
            <ReceiptSkeleton />
          </div>
        }
      >
        <ReceiptFromParams params={params} />
      </Suspense>
    </>
  );
}
