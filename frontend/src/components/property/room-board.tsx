import type { Icon } from "@phosphor-icons/react";
import {
  CheckCircleIcon,
  DoorOpenIcon,
  HourglassIcon,
  ReceiptIcon,
} from "@phosphor-icons/react/ssr";

import { HashLink } from "@/components/common/hash-link";
import { TextLink } from "@/components/common/text-link";
import { summarizeRooms } from "@/lib/data/rooms";
import { etherscanAddressUrl, formatPeriod, formatRupiah } from "@/lib/format";
import type { HexString, RoomRent } from "@/lib/types";
import { cn } from "@/lib/utils";

type TileState = "paid" | "pending" | "unpaid" | "vacant";

const tileStyles: Record<TileState, { label: string; icon: Icon; tile: string; muted: string }> = {
  paid: {
    label: "Lunas",
    icon: CheckCircleIcon,
    tile: "bg-success text-success-foreground",
    muted: "text-success-foreground",
  },
  pending: {
    label: "Menunggu",
    icon: HourglassIcon,
    tile: "bg-warning-muted text-foreground",
    muted: "text-warning-muted-foreground",
  },
  unpaid: {
    label: "Belum bayar",
    icon: ReceiptIcon,
    tile: "border border-border bg-card text-foreground",
    muted: "text-muted-foreground",
  },
  vacant: {
    label: "Kosong",
    icon: DoorOpenIcon,
    tile: "border border-dashed border-input bg-background text-muted-foreground",
    muted: "text-muted-foreground",
  },
};

function tileState(room: RoomRent): TileState {
  if (!room.occupied) return "vacant";
  if (room.billStatus === "PAID") return "paid";
  if (room.billStatus === "PENDING") return "pending";
  return "unpaid";
}

/** Keterangan kecil di bawah status: hash tx, nominal, atau keterangan lain. */
function TileDetail({ room, state }: { room: RoomRent; state: TileState }) {
  if (state === "paid") {
    if (room.chainStatus === "CONFIRMED" && room.txHash) {
      return (
        <HashLink
          hash={room.txHash}
          label={`Transaksi sewa ${room.code}`}
          className="text-[11px] leading-4 text-success-foreground"
        />
      );
    }
    return <span>Menunggu pencatatan</span>;
  }
  if (state === "pending") return <span>Midtrans</span>;
  if (state === "unpaid") return <span className="tabular-nums">{formatRupiah(room.amountIdr)}</span>;
  return <span>Siap disewa</span>;
}

/**
 * Ubin satu kamar (Figma: "Ubin kamar"). Ponsel: ubin ringkas (nomor + ikon).
 * Layar sm ke atas: ubin normal 104 px dengan label status dan detail.
 */
function RoomTile({ room }: { room: RoomRent }) {
  const state = tileState(room);
  const style = tileStyles[state];
  const StatusIcon = style.icon;

  return (
    <li
      className={cn(
        "flex aspect-square min-w-0 flex-col items-center justify-center gap-1 rounded-md sm:aspect-auto sm:h-[104px] sm:items-start sm:justify-between sm:rounded-lg sm:p-3",
        style.tile
      )}
    >
      <span className="text-sm leading-5 font-semibold sm:font-display sm:text-[22px] sm:leading-6 sm:font-extrabold sm:tracking-[-0.02em]">
        {room.code}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn(
            "flex items-center gap-1 text-xs leading-4 font-medium whitespace-nowrap",
            style.muted
          )}
        >
          <StatusIcon aria-hidden className="size-4 shrink-0 sm:size-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">{style.label}</span>
        </span>
        <span className={cn("hidden truncate text-xs leading-4 sm:block", style.muted)}>
          <TileDetail room={room} state={state} />
        </span>
      </span>
    </li>
  );
}

interface RoomBoardProps {
  rooms: RoomRent[];
  period: string;
  propertyName: string;
  roomCount: number;
  ledgerAddress: HexString;
  className?: string;
}

/**
 * Papan kamar (Figma: "Papan kamar"): status sewa 10 kamar pada periode berjalan.
 * Lime = sudah dibayar dan tercatat di KosLedger. Dipakai di beranda, tab
 * Blockchain, dan nanti grid kamar pengelola (progress 4).
 */
export function RoomBoard({
  rooms,
  period,
  propertyName,
  roomCount,
  ledgerAddress,
  className,
}: RoomBoardProps) {
  const summary = summarizeRooms(rooms);
  const periodLabel = `Sewa ${formatPeriod(period)}`;

  return (
    <section
      aria-label={`Papan kamar ${propertyName}, ${periodLabel}`}
      className={cn(
        "flex w-full flex-col gap-3.5 rounded-xl border border-border bg-card p-4 text-card-foreground sm:gap-5 sm:p-6",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm leading-5 font-semibold sm:text-h5">{periodLabel}</h3>
          <p className="hidden text-xs leading-4 text-muted-foreground sm:block">
            {propertyName}, {roomCount} kamar
          </p>
        </div>
        <p className="flex flex-col items-end text-right">
          <span className="text-xs leading-4 font-medium text-muted-foreground sm:text-number-md sm:font-semibold sm:text-card-foreground">
            <span className="tabular-nums">
              {summary.paidCount} dari {summary.occupiedCount}
            </span>
            <span className="sm:hidden"> sudah bayar</span>
          </span>
          <span className="hidden text-xs leading-4 text-muted-foreground sm:block">
            penghuni sudah bayar
          </span>
        </p>
      </div>

      <ul className="grid grid-cols-5 gap-1 sm:gap-2">
        {rooms.map((room) => (
          <RoomTile key={room.code} room={room} />
        ))}
      </ul>

      <div className="flex flex-col gap-3 border-border sm:flex-row sm:items-center sm:justify-between sm:border-t sm:pt-4">
        <div className="flex flex-col">
          <p className="text-xs leading-4 font-medium sm:text-sm sm:leading-5 sm:font-semibold">
            <span className="tabular-nums">{formatRupiah(summary.collectedAmountIdr)}</span> masuk
            bulan ini
          </p>
          <p className="text-xs leading-4 text-muted-foreground">
            Setiap pembayaran tercatat di kontrak KosLedger, Sepolia
          </p>
        </div>
        <TextLink href={etherscanAddressUrl(ledgerAddress)} external>
          Lihat kontrak
        </TextLink>
      </div>
    </section>
  );
}
