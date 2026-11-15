import type { TenantRoomDto } from "@/lib/api/types";
import { getDemoAccount } from "@/lib/data/demo-accounts";
import { kosSumbersari01 } from "@/lib/data/properties";
import { formatMonthYear, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Kartu kamar (Figma: "Kartu kamar"). Sewa dan masa sewa berasal dari API.
 * Alamat dan pengelola belum ada di TenantRoomDto, jadi sementara memakai data
 * statis properti yang sama dengan halaman publik.
 */
export function RoomCard({ room, className }: { room: TenantRoomDto; className?: string }) {
  const details = [
    { label: "Alamat", value: kosSumbersari01.shortAddress },
    { label: "Sewa", value: `${formatRupiah(room.monthlyRentIdr)} per bulan` },
    ...(room.leaseStart && room.leaseEnd
      ? [
          {
            label: "Masa sewa",
            value: `${formatMonthYear(room.leaseStart)} sampai ${formatMonthYear(room.leaseEnd)}`,
          },
        ]
      : []),
    { label: "Pengelola", value: getDemoAccount("pengelola").name },
  ];

  return (
    <section
      aria-labelledby="judul-kamar"
      className={cn(
        "flex flex-col gap-4 rounded-xl bg-card px-6 pt-5 pb-6 text-card-foreground",
        className
      )}
    >
      <div className="flex flex-col gap-0.5">
        <h2 id="judul-kamar" className="text-h3 font-semibold">
          Kamar {room.number}
        </h2>
        <p className="text-sm leading-5 text-muted-foreground">
          {room.propertyName}, {kosSumbersari01.city}
        </p>
      </div>
      <dl className="flex flex-col gap-2.5 text-sm leading-5">
        {details.map((detail) => (
          <div key={detail.label} className="flex items-start justify-between gap-4">
            <dt className="shrink-0 text-muted-foreground">{detail.label}</dt>
            <dd className="text-right font-medium">{detail.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
