import { ArrowSquareOutIcon, HourglassIcon } from "@phosphor-icons/react/ssr";

import { TextLink } from "@/components/common/text-link";
import type { InvestorCurrentPeriodDto, RentFeedItemDto } from "@/lib/api/types";
import { kosSumbersari01 } from "@/lib/data/properties";
import { etherscanAddressUrl, etherscanTxUrl, formatDayMonth, shortenHash } from "@/lib/format";
import { feedStatus, isRunningPeriod } from "@/lib/investor";
import { periodMonthName } from "@/lib/period";
import { cn } from "@/lib/utils";

/** Keterangan di kepala kartu, mis. "6 dari 9 kamar terisi sudah tercatat. ..." */
function feedCaption(current: InvestorCurrentPeriodDto): string {
  const vacant = current.rentFeed
    .filter((item) => feedStatus(item) === "VACANT")
    .map((item) => item.roomNumber);
  if (current.roomsTotal > 0 && current.roomsRecorded >= current.roomsTotal) {
    const vacantNote = vacant.length > 0 ? ` ${vacant.join(", ")} kosong.` : "";
    return `Semua ${current.roomsTotal} kamar terisi sudah tercatat.${vacantNote}`;
  }
  const suffix = isRunningPeriod(current.status) ? " Diperbarui setiap ada pembayaran." : "";
  return `${current.roomsRecorded} dari ${current.roomsTotal} kamar terisi sudah tercatat.${suffix}`;
}

/** Tanggal kecil di samping nomor kamar. */
function RowDate({ item }: { item: RentFeedItemDto }) {
  const status = feedStatus(item);
  let text: string | null = null;
  if (status === "VACANT") text = "Kamar kosong";
  else if (status === "UNPAID") text = item.dueDate ? `Jatuh tempo ${formatDayMonth(item.dueDate)}` : null;
  else {
    const date = item.paidAt ?? item.recordedAt;
    text = date ? formatDayMonth(date) : null;
  }
  return text ? <span className="text-xs leading-4 text-muted-foreground">{text}</span> : null;
}

/** Sisi kanan baris: hash yang menaut ke Etherscan, atau keterangan status. */
function RowStatus({ item }: { item: RentFeedItemDto }) {
  const status = feedStatus(item);
  if (status === "RECORDED" && item.txHash) {
    return (
      <a
        href={etherscanTxUrl(item.txHash)}
        target="_blank"
        rel="noopener noreferrer"
        title={item.txHash}
        className="inline-flex items-center gap-1.5 rounded-sm font-mono text-sm leading-5 text-card-foreground underline-offset-2 hover:underline"
      >
        <span className="sr-only">Transaksi sewa {item.roomNumber}, lihat di Etherscan: </span>
        {shortenHash(item.txHash)}
        <ArrowSquareOutIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      </a>
    );
  }
  if (status === "RECORDED") {
    return <span className="text-sm leading-5 text-card-foreground">Tercatat</span>;
  }
  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm leading-5 text-muted-foreground">
        <HourglassIcon aria-hidden className="size-3.5 shrink-0" />
        Menunggu pencatatan
      </span>
    );
  }
  return (
    <span className="text-sm leading-5 text-muted-foreground">
      {status === "VACANT" ? "Tidak ditagih" : "Belum dibayar"}
    </span>
  );
}

interface RentFeedCardProps {
  current: InvestorCurrentPeriodDto;
  className?: string;
}

/**
 * Daftar sewa masuk (Figma: "Daftar sewa masuk"), 432 px di kanan ringkasan
 * investor. Satu baris per kamar dengan hash transaksi recordRent, tanpa nama
 * penghuni. Pencatatan yang belum selesai, termasuk yang sedang diulang admin,
 * selalu ditulis Menunggu pencatatan.
 */
export function RentFeedCard({ current, className }: RentFeedCardProps) {
  const items = [...current.rentFeed].sort((a, b) =>
    a.roomNumber.localeCompare(b.roomNumber, "id", { numeric: true })
  );
  const month = periodMonthName(current.period);

  return (
    <section
      aria-labelledby="judul-sewa-masuk"
      className={cn("flex flex-col rounded-xl bg-card px-6 pt-6 pb-5 text-card-foreground", className)}
    >
      <div className="flex flex-col gap-1 pb-3.5">
        <h2 id="judul-sewa-masuk" className="text-h5 font-semibold">
          Sewa masuk {month}
        </h2>
        <p className="text-sm leading-5 text-muted-foreground">{feedCaption(current)}</p>
      </div>

      {items.length === 0 ? (
        <p className="border-t border-border py-4 text-sm leading-5 text-muted-foreground">
          Belum ada sewa {month} yang tercatat.
        </p>
      ) : (
        <ul>
          {items.map((item) => (
            <li
              key={item.roomNumber}
              className="flex items-center justify-between gap-3 border-t border-border py-[11px]"
            >
              <span className="flex min-w-0 items-center gap-2.5 whitespace-nowrap">
                <span className="text-sm leading-5 font-semibold">{item.roomNumber}</span>
                <RowDate item={item} />
              </span>
              <RowStatus item={item} />
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-border pt-3.5">
        <TextLink href={etherscanAddressUrl(kosSumbersari01.contracts.kosLedger)} external>
          Lihat kontrak KosLedger di Etherscan
        </TextLink>
      </div>
    </section>
  );
}
