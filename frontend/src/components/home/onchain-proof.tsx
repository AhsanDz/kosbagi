import { OnchainReceipt } from "@/components/property/onchain-receipt";
import { RoomBoard } from "@/components/property/room-board";
import { SectionHeading } from "@/components/public/section-heading";
import { kosSumbersari01 } from "@/lib/data/properties";
import { currentPeriod, roomRents } from "@/lib/data/rooms";

/**
 * Bagian "Setiap sewa tercatat.": papan kamar periode berjalan dan kuitansi
 * on-chain bercap TERCATAT. Ini bukti utama KosBagi: pendapatan bisa
 * diverifikasi per transaksi.
 */
export function OnchainProof() {
  const property = kosSumbersari01;

  return (
    <section aria-labelledby="bukti-on-chain" className="container-page py-14 lg:py-24">
      <div className="flex flex-col gap-5 lg:gap-6">
        <SectionHeading id="bukti-on-chain">Setiap sewa tercatat.</SectionHeading>
        <p className="max-w-[640px] text-base leading-6 text-muted-foreground lg:text-lg lg:leading-7">
          Papan ini membaca tagihan dan kontrak KosLedger. Kamar berwarna stabilo sudah dibayar dan
          tercatat di Sepolia.
        </p>
        <div className="grid items-start gap-16 pt-4 xl:grid-cols-[644px_minmax(0,516px)] xl:gap-10">
          <RoomBoard
            rooms={roomRents}
            period={currentPeriod}
            propertyName={property.name}
            roomCount={property.roomCount}
            ledgerAddress={property.contracts.kosLedger}
            className="max-w-[644px]"
          />
          <OnchainReceipt className="mt-4 xl:mt-0" />
        </div>
      </div>
    </section>
  );
}
