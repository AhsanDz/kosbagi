import { TextLink } from "@/components/common/text-link";
import type { ManagerFollowUpDto, ManagerRoomsPayload } from "@/lib/api/types";
import { formatDayMonth } from "@/lib/format";
import { periodMonthName } from "@/lib/period";

interface FollowUpView {
  key: string;
  title: string;
  status: string;
  /** true untuk status yang menunggu sistem (warna warning), false untuk tindakan penghuni. */
  warning: boolean;
  body: string;
  link?: { href: string; label: string };
}

function describe(
  item: ManagerFollowUpDto,
  payload: ManagerRoomsPayload,
  index: number,
  periodClosed: boolean
): FollowUpView {
  const room = payload.rooms.find((candidate) => candidate.roomNumber === item.roomNumber);
  const key = `${item.kind}-${item.roomNumber ?? item.expenseId ?? index}`;

  if (item.kind === "OVERDUE") {
    const due = room?.bill?.dueDate;
    const days = room?.daysOverdue ?? 0;
    return {
      key,
      title: item.roomNumber ?? "Kamar",
      status: "Belum dibayar",
      warning: false,
      body: [
        due ? `Jatuh tempo ${formatDayMonth(due)} sudah lewat ${days} hari.` : "Tagihan sudah lewat jatuh tempo.",
        // Sama dengan keterangan di slip penghuni: tagihan periode tertutup tidak bisa dibayar.
        periodClosed ? "Periode sudah ditutup, jadi tagihan ini tidak bisa lagi dibayar lewat KosBagi." : "",
      ]
        .filter(Boolean)
        .join(" "),
    };
  }
  if (item.kind === "CHAIN_FAILED") {
    const paidAt = room?.bill?.paidAt;
    return {
      key,
      title: item.roomNumber ?? "Kamar",
      status: paidAt ? `Lunas ${formatDayMonth(paidAt)}, belum tercatat` : "Lunas, belum tercatat",
      warning: true,
      body: "Pencatatan on-chain gagal dan sedang diulang admin. Penghuni tidak perlu membayar lagi.",
    };
  }
  return {
    key,
    title: "Nota biaya",
    status: "Belum tercatat",
    warning: true,
    body: "Hash nota sedang dicatat di KosLedger. Periode baru bisa ditutup setelah tercatat.",
    link: {
      href: `/pengelola/biaya?periode=${payload.period}`,
      label: "Buka biaya dan nota",
    },
  };
}

/** Teks saat tidak ada tindak lanjut, mengikuti status periode (temuan QA P5 R10). */
function emptyText(payload: ManagerRoomsPayload, periodClosed: boolean | undefined): string {
  const { summary } = payload;
  const allRecorded = summary.roomsOccupied > 0 && summary.roomsRecorded >= summary.roomsOccupied;
  if (!allRecorded) return "Tidak ada yang perlu ditindaklanjuti sekarang.";

  const recorded = `Tidak ada. Semua sewa ${periodMonthName(payload.period)} sudah tercatat`;
  if (periodClosed === true) return `${recorded} dan periode sudah ditutup admin.`;
  if (periodClosed === false) return `${recorded}, jadi periode siap ditutup admin.`;
  // Status periode belum terbaca: jangan menebak.
  return `${recorded}.`;
}

interface FollowUpCardProps {
  payload: ManagerRoomsPayload;
  /** Dari `closed` GET /expenses periode yang sama; undefined selama belum terbaca. */
  periodClosed?: boolean;
}

/**
 * Kartu Perlu ditindaklanjuti (Figma: Pengelola / Status kamar): tagihan yang
 * lewat jatuh tempo, sewa lunas yang pencatatannya gagal, dan nota yang belum
 * tercatat. Pengelola melihat status sebenarnya, termasuk kata gagal. Setelah
 * periode ditutup, kartu tidak lagi menulis "siap ditutup".
 */
export function FollowUpCard({ payload, periodClosed }: FollowUpCardProps) {
  const items = payload.followUps.map((item, index) =>
    describe(item, payload, index, periodClosed === true)
  );

  return (
    <section
      aria-labelledby="judul-tindak-lanjut"
      className="flex flex-col rounded-xl bg-card px-6 pt-6 pb-5 text-card-foreground"
    >
      <h2 id="judul-tindak-lanjut" className="text-h5 font-semibold">
        Perlu ditindaklanjuti
      </h2>
      {items.length === 0 ? (
        <p className="pt-1 text-sm leading-5 text-muted-foreground">
          {emptyText(payload, periodClosed)}
        </p>
      ) : (
        <ul className="mt-2">
          {items.map((item) => (
            <li key={item.key} className="flex flex-col gap-0.5 border-t border-border py-3 text-sm leading-5">
              <p className="flex flex-wrap items-center gap-x-2">
                <span className="font-semibold">{item.title}</span>
                <span
                  className={item.warning ? "font-medium text-warning-muted-foreground" : "font-medium"}
                >
                  {item.status}
                </span>
              </p>
              <p className="text-muted-foreground">{item.body}</p>
              {item.link ? (
                <TextLink href={item.link.href} className="mt-1 self-start">
                  {item.link.label}
                </TextLink>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
