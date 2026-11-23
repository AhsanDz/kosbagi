import type {
  AdminJobDto,
  AdminJobStatus,
  ChainJobType,
  ExpenseDto,
  PeriodPayload,
  PeriodRequirementDto,
  PeriodRequirementKey,
} from "@/lib/api/types";
import { formatDate, formatPeriod, shortenHash } from "@/lib/format";
import { periodMonthName } from "@/lib/period";
import type { ChainTxStatus } from "@/lib/types";

/** Batas percobaan otomatis worker sebelum job menjadi FAILED (BullMQ attempts). */
export const MAX_JOB_ATTEMPTS = 5;

export const JOB_TYPE_LABELS: Record<ChainJobType, string> = {
  RECORD_RENT: "Catat sewa",
  RECORD_EXPENSE: "Catat biaya",
  CLOSE_PERIOD: "Tutup periode",
  WHITELIST_KYC: "Catat lolos KYC",
  TRANSFER_TOKENS: "Kirim token",
};

/** Status job ke komponen Status on-chain: admin melihat status sebenarnya. */
export const jobChainStatus: Record<AdminJobStatus, ChainTxStatus> = {
  QUEUED: "QUEUED",
  PENDING: "SENT",
  RECORDED: "CONFIRMED",
  FAILED: "FAILED",
};

/** Referensi job yang mudah dibaca: hash dan alamat disingkat 6+4. */
export function jobReference(job: AdminJobDto): string {
  if (job.type === "RECORD_EXPENSE") return `nota ${shortenHash(job.reference)}`;
  if (job.type === "WHITELIST_KYC") return `dompet ${shortenHash(job.reference)}`;
  if (job.type === "CLOSE_PERIOD") return `periode ${job.reference}`;
  return job.reference;
}

/** Nomor kamar dari order_id sewa: "RENT-SMR01-K08-2026-11" -> "K08". */
export function roomFromOrderId(orderId: string): string | null {
  return /^RENT-[A-Z0-9]+-(K\d+)-/.exec(orderId)?.[1] ?? null;
}

export function isOpenJob(job: AdminJobDto): boolean {
  return job.status !== "RECORDED";
}

/** Job gagal yang belum ditandai ditangani admin: masih menghalangi penutupan periode. */
export function isBlockingFailure(job: AdminJobDto): boolean {
  return job.status === "FAILED" && !job.resolution;
}

/** Penjelasan singkat satu job untuk kalimat, mis. "catat sewa K08". */
function jobPhrase(job: AdminJobDto): string {
  const label = JOB_TYPE_LABELS[job.type].toLowerCase();
  if (job.type === "RECORD_RENT") return `${label} ${roomFromOrderId(job.reference) ?? job.reference}`;
  return `${label} ${jobReference(job)}`;
}

function requirement(payload: PeriodPayload, key: PeriodRequirementKey): PeriodRequirementDto {
  return payload.requirements.find((item) => item.key === key) ?? { key, ok: true, count: 0 };
}

/** Semua syarat penutupan terpenuhi. */
export function isPeriodReady(payload: PeriodPayload): boolean {
  return payload.requirements.every((item) => item.ok);
}

export interface RequirementRow {
  key: string;
  ok: boolean;
  title: string;
  detail: string | null;
}

/**
 * Baris Kartu syarat penutupan (Figma: "Kartu syarat penutupan"). Angka dari
 * GET /periods/:period; nama kamar dan nota diambil dari antrean job dan daftar
 * biaya bila keduanya sudah dimuat.
 */
export function requirementRows(
  payload: PeriodPayload,
  openJobs: AdminJobDto[] | undefined,
  expenses: ExpenseDto[] | undefined
): RequirementRow[] {
  const { receipt } = payload;
  const rent = requirement(payload, "RENT_UNRECORDED");
  const expense = requirement(payload, "EXPENSE_UNRECORDED");
  const transfer = requirement(payload, "TRANSFER_UNRECORDED");
  const failed = requirement(payload, "JOB_FAILED");
  const jobs = openJobs ?? [];
  const rows: RequirementRow[] = [];

  // Sewa: kamar yang gagal disebut namanya, sisanya dihitung menunggu.
  const rentTotal = receipt.roomsRecorded + rent.count;
  let rentDetail: string | null = null;
  if (!rent.ok) {
    const failedRooms = jobs
      .filter((job) => job.type === "RECORD_RENT" && isBlockingFailure(job))
      .map((job) => roomFromOrderId(job.reference) ?? job.reference);
    const waiting = rent.count - failedRooms.length;
    const parts: string[] = [];
    if (failedRooms.length > 0) {
      parts.push(`Kamar ${failedRooms.join(", ")} gagal dicatat. Ulangi dari antrean job.`);
    }
    if (waiting > 0) parts.push(`${waiting} sewa lunas masih menunggu pencatatan.`);
    rentDetail = parts.join(" ");
  }
  rows.push({
    key: "RENT_UNRECORDED",
    ok: rent.ok,
    title: `${receipt.roomsRecorded} dari ${Math.max(rentTotal, receipt.roomsRecorded)} sewa tercatat di Sepolia`,
    detail: rentDetail,
  });

  // Nota: sebut kategori dan tanggal nota yang belum tercatat bila daftar biaya ada.
  const expenseTotal = receipt.expensesRecorded + expense.count;
  let expenseDetail: string | null = null;
  if (!expense.ok) {
    const unrecorded = (expenses ?? []).filter((item) => item.chain.status !== "RECORDED");
    if (unrecorded.length > 0) {
      expenseDetail = unrecorded
        .map((item) => {
          const what = `Nota ${item.category.label.toLowerCase()} ${formatDate(item.receiptDate)}`;
          return item.chain.status === "FAILED"
            ? `${what} gagal dicatat. Ulangi dari antrean job.`
            : `${what} masih menunggu pencatatan.`;
        })
        .join(" ");
    } else {
      expenseDetail = `${expense.count} nota masih menunggu pencatatan.`;
    }
  }
  rows.push({
    key: "EXPENSE_UNRECORDED",
    ok: expense.ok,
    title:
      expenseTotal === 0
        ? "Belum ada nota biaya"
        : `${receipt.expensesRecorded} dari ${expenseTotal} nota tercatat`,
    detail: expenseDetail,
  });

  // Pemindahan token hanya ditampilkan bila ada yang tertahan (saldo snapshot harus benar).
  if (!transfer.ok) {
    rows.push({
      key: "TRANSFER_UNRECORDED",
      ok: false,
      title: "Token yang sudah dibayar sudah di dompet investor",
      detail: `${transfer.count} pesanan token lunas belum pindah ke dompet investor.`,
    });
  }

  const failedJobs = jobs.filter(isBlockingFailure);
  rows.push({
    key: "JOB_FAILED",
    ok: failed.ok,
    title: "Tidak ada job on-chain yang gagal",
    detail: failed.ok
      ? null
      : failedJobs.length > 0
        ? `${failed.count} job gagal: ${failedJobs.map(jobPhrase).join(", ")}.`
        : `${failed.count} job gagal. Ulangi atau tandai ditangani dari antrean job.`,
  });

  rows.push({
    key: "NOT_CLOSED",
    ok: payload.status === "OPEN" || payload.status === "CLOSE_FAILED",
    title: "Periode belum pernah ditutup",
    detail: null,
  });

  return rows;
}

/** Kalimat status di kartu Periode berjalan ringkasan admin. */
export function periodReadinessText(
  payload: PeriodPayload,
  openJobs: AdminJobDto[] | undefined
): { text: string; blocked: boolean } {
  const month = periodMonthName(payload.period);
  if (payload.status === "DISTRIBUTED") {
    return { text: `Periode ${month} sudah ditutup dan bagi hasilnya sudah dibagikan.`, blocked: false };
  }
  if (payload.status === "CLOSED") {
    return { text: `Periode ${month} sudah ditutup. Distribusi bisa dijalankan.`, blocked: false };
  }
  if (payload.status === "CLOSING") {
    return { text: "Transaksi closePeriod sedang dikirim ke Sepolia.", blocked: false };
  }
  if (payload.status === "CLOSE_FAILED") {
    return { text: "Penutupan gagal dicatat. Ulangi dari halaman Tutup periode.", blocked: true };
  }
  if (isPeriodReady(payload)) {
    return { text: "Semua syarat penutupan terpenuhi. Periode siap ditutup.", blocked: false };
  }

  const jobs = openJobs ?? [];
  const rent = requirement(payload, "RENT_UNRECORDED");
  const expense = requirement(payload, "EXPENSE_UNRECORDED");
  const transfer = requirement(payload, "TRANSFER_UNRECORDED");
  const failed = requirement(payload, "JOB_FAILED");
  const rentFailed = jobs.filter((job) => job.type === "RECORD_RENT" && isBlockingFailure(job)).length;
  const expenseFailed = jobs.filter((job) => job.type === "RECORD_EXPENSE" && isBlockingFailure(job)).length;

  const parts: string[] = [];
  if (rentFailed > 0) parts.push(`${rentFailed} sewa gagal dicatat`);
  if (rent.count - rentFailed > 0) parts.push(`${rent.count - rentFailed} sewa masih menunggu pencatatan`);
  if (expenseFailed > 0) parts.push(`${expenseFailed} nota gagal dicatat`);
  if (expense.count - expenseFailed > 0) {
    parts.push(`${expense.count - expenseFailed} nota masih menunggu pencatatan`);
  }
  if (!transfer.ok) parts.push(`${transfer.count} pesanan token belum pindah ke dompet investor`);
  if (parts.length === 0 && !failed.ok) parts.push(`${failed.count} job on-chain gagal`);

  const joined =
    parts.length > 1 ? `${parts.slice(0, -1).join(", ")} dan ${parts.at(-1)}` : (parts[0] ?? "");
  return { text: `Belum siap ditutup: ${joined}.`, blocked: true };
}

/** Teks tombol Tutup periode, mis. "Tutup periode November 2026". */
export function closeButtonLabel(period: string): string {
  return `Tutup periode ${formatPeriod(period)}`;
}
