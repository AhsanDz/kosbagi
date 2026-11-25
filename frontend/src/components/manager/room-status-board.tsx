import type { Icon } from "@phosphor-icons/react";
import {
  CheckCircleIcon,
  DoorOpenIcon,
  HourglassIcon,
  ReceiptIcon,
} from "@phosphor-icons/react/ssr";

import { HashLink } from "@/components/common/hash-link";
import type { ManagerRoomDto } from "@/lib/api/types";
import { formatRupiah } from "@/lib/format";
import { sortRooms, tileKind, type ManagerTileKind } from "@/lib/manager";
import { cn } from "@/lib/utils";

const tileStyles: Record<
  ManagerTileKind,
  { label: string; icon: Icon; tile: string; number: string; muted: string }
> = {
  recorded: {
    label: "Lunas",
    icon: CheckCircleIcon,
    tile: "bg-success",
    number: "text-success-foreground",
    muted: "text-success-foreground",
  },
  waiting: {
    label: "Menunggu",
    icon: HourglassIcon,
    tile: "bg-warning-muted",
    number: "text-foreground",
    muted: "text-warning-muted-foreground",
  },
  unpaid: {
    label: "Belum bayar",
    icon: ReceiptIcon,
    tile: "border border-border bg-card",
    number: "text-foreground",
    muted: "text-muted-foreground",
  },
  vacant: {
    label: "Kosong",
    icon: DoorOpenIcon,
    tile: "border border-dashed border-input bg-background",
    number: "text-muted-foreground",
    muted: "text-muted-foreground",
  },
};

/** Keterangan pendek di bawah status ubin ("Lewat 8 hari", "Belum tercatat"). */
function TileDetail({ room, kind }: { room: ManagerRoomDto; kind: ManagerTileKind }) {
  if (kind === "recorded") {
    return room.chain?.txHash ? (
      <HashLink
        hash={room.chain.txHash}
        label={`Transaksi sewa ${room.roomNumber}`}
        // Warna teks ubin lime, bukan text-primary: di mode gelap primary
        // berwarna terang sehingga hash hampir tak terbaca di atas lime (P5).
        className="text-[11px] leading-4 text-success-foreground"
      />
    ) : (
      <span>Tercatat</span>
    );
  }
  if (kind === "waiting") return <span>Belum tercatat</span>;
  if (kind === "unpaid") {
    if (!room.bill) return <span>Belum ada tagihan</span>;
    return room.daysOverdue > 0 ? (
      <span>Lewat {room.daysOverdue} hari</span>
    ) : (
      <span className="tabular-nums">{formatRupiah(room.bill.amountIdr)}</span>
    );
  }
  return <span>{room.status === "MAINTENANCE" ? "Dalam perbaikan" : "Kamar kosong"}</span>;
}

function ManagerRoomTile({ room }: { room: ManagerRoomDto }) {
  const kind = tileKind(room);
  const style = tileStyles[kind];
  const StatusIcon = style.icon;

  return (
    <li
      className={cn(
        "flex h-[104px] min-w-0 flex-col items-start justify-between rounded-lg p-3",
        style.tile
      )}
    >
      <span
        className={cn(
          "font-display text-[22px] leading-6 font-extrabold tracking-[-0.02em]",
          style.number
        )}
      >
        {room.roomNumber}
      </span>
      <span className={cn("flex min-w-0 flex-col gap-0.5 text-xs leading-4", style.muted)}>
        <span className="flex items-center gap-1 font-medium whitespace-nowrap">
          <StatusIcon aria-hidden className="size-3.5 shrink-0" />
          {style.label}
          <span className="sr-only">,</span>
        </span>
        <span className="truncate">
          <TileDetail room={room} kind={kind} />
        </span>
      </span>
    </li>
  );
}

/**
 * Papan kamar pengelola (Figma: Pengelola / Status kamar, "Papan kamar"):
 * sepuluh Ubin kamar. Ubin lime berarti pembayaran sudah tercatat di Sepolia
 * dan hash-nya menaut ke Etherscan. Pengelola tidak punya tombol mengulang
 * pencatatan; itu ada di antrean job admin.
 */
export function RoomStatusBoard({ rooms }: { rooms: ManagerRoomDto[] }) {
  return (
    <section
      aria-labelledby="judul-papan-kamar"
      className="flex min-w-0 flex-col gap-4 rounded-xl bg-card px-5 pt-6 pb-7 text-card-foreground md:px-7"
    >
      <div className="flex flex-col gap-1">
        <h2 id="judul-papan-kamar" className="text-h5 font-semibold">
          Papan kamar
        </h2>
        <p className="text-sm leading-5 text-muted-foreground">
          Ubin lime berarti pembayaran sudah tercatat di Sepolia. Klik hash untuk membukanya di
          Etherscan.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
        {sortRooms(rooms).map((room) => (
          <ManagerRoomTile key={room.roomNumber} room={room} />
        ))}
      </ul>
    </section>
  );
}
