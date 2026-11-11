import { API_BASE_URL } from "@/lib/config";

/** Validasi dan pengiriman form pengajuan kos ke POST /api/owner-applications. */

export interface ApplicationValues {
  ownerName: string;
  contact: string;
  propertyAddress: string;
  /** Tiga isian angka berupa deretan digit (lihat input-format.ts). */
  roomCount: string;
  monthlyRentIdr: string;
  occupancyPercent: string;
  consent: boolean;
}

export type ApplicationField = keyof ApplicationValues;
export type ApplicationErrors = Partial<Record<ApplicationField, string>>;

export interface SubmittedApplication {
  applicationNumber: string;
  submittedAt: string;
  contact: string;
}

export type SubmitOutcome =
  | { kind: "success"; application: SubmittedApplication }
  | { kind: "invalid"; errors: ApplicationErrors }
  | { kind: "failed"; message: string };

export const EMPTY_APPLICATION: ApplicationValues = {
  ownerName: "",
  contact: "",
  propertyAddress: "",
  roomCount: "",
  monthlyRentIdr: "",
  occupancyPercent: "",
  consent: false,
};

const FIELD_NAMES = Object.keys(EMPTY_APPLICATION) as ApplicationField[];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WHATSAPP_PATTERN = /^\d{9,15}$/;
/** Pemisah yang lazim ditulis di nomor telepon: spasi, strip, titik, kurung, dan + di depan. */
const PHONE_SEPARATORS = /[\s().+-]/g;

const SERVER_UNREACHABLE = "Server KosBagi tidak bisa dihubungi. Coba lagi beberapa saat.";
const TOO_MANY_REQUESTS = "Terlalu banyak pengajuan dari perangkat ini. Tunggu sebentar lalu kirim lagi.";
const SUBMISSION_FAILED = "Pengajuan belum terkirim karena gangguan di server. Coba lagi beberapa saat.";

/** Nomor WhatsApp dikirim hanya berisi digit; email dikirim apa adanya. */
export function normalizeContact(contact: string): string {
  const trimmed = contact.trim();
  return trimmed.includes("@") ? trimmed : trimmed.replace(PHONE_SEPARATORS, "");
}

function contactError(contact: string): string | undefined {
  const normalized = normalizeContact(contact);
  if (!normalized) return "Isi nomor WhatsApp atau email.";
  if (/^\d+$/.test(normalized)) {
    return WHATSAPP_PATTERN.test(normalized) ? undefined : "Nomor WhatsApp harus 9 sampai 15 digit.";
  }
  return EMAIL_PATTERN.test(normalized) ? undefined : "Email belum lengkap. Contoh: nama@kosbagi.test";
}

function occupancyError(digits: string): string | undefined {
  if (!digits) return "Isi okupansi dengan angka 0 sampai 100.";
  return Number(digits) > 100 ? "Okupansi paling tinggi 100%." : undefined;
}

export function validateApplication(values: ApplicationValues): ApplicationErrors {
  const errors: ApplicationErrors = {};

  if (!values.ownerName.trim()) errors.ownerName = "Isi nama pemilik.";

  const contact = contactError(values.contact);
  if (contact) errors.contact = contact;

  if (!values.propertyAddress.trim()) errors.propertyAddress = "Isi alamat kos.";

  if (!values.roomCount) errors.roomCount = "Isi jumlah kamar dengan angka.";
  else if (Number(values.roomCount) < 1) errors.roomCount = "Jumlah kamar paling sedikit 1.";

  if (!values.monthlyRentIdr) errors.monthlyRentIdr = "Isi sewa per kamar dengan angka.";
  else if (Number(values.monthlyRentIdr) < 1) errors.monthlyRentIdr = "Sewa per kamar harus lebih dari Rp0.";

  const occupancy = occupancyError(values.occupancyPercent);
  if (occupancy) errors.occupancyPercent = occupancy;

  if (!values.consent) errors.consent = "Centang persetujuan untuk melanjutkan.";

  return errors;
}

/** Mengubah `details` dari server ({ path, message }) menjadi error per field. */
function fieldErrorsFromDetails(details: unknown): ApplicationErrors {
  if (!Array.isArray(details)) return {};

  const errors: ApplicationErrors = {};
  for (const detail of details as Array<{ path?: unknown; message?: unknown }>) {
    const field = FIELD_NAMES.find((name) => name === detail?.path);
    if (field && typeof detail.message === "string") errors[field] = detail.message;
  }
  return errors;
}

export async function submitApplication(values: ApplicationValues): Promise<SubmitOutcome> {
  const contact = normalizeContact(values.contact);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/owner-applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerName: values.ownerName.trim(),
        contact,
        propertyAddress: values.propertyAddress.trim(),
        roomCount: Number(values.roomCount),
        monthlyRentIdr: Number(values.monthlyRentIdr),
        occupancyPercent: Number(values.occupancyPercent),
        consent: values.consent,
      }),
    });
  } catch {
    return { kind: "failed", message: SERVER_UNREACHABLE };
  }

  const body: unknown = await response.json().catch(() => null);
  const { data, error } = (body ?? {}) as {
    data?: { applicationNumber: string; submittedAt: string };
    error?: { code?: string; details?: unknown };
  };

  if (response.status === 201 && data) {
    return {
      kind: "success",
      application: {
        applicationNumber: data.applicationNumber,
        submittedAt: data.submittedAt,
        contact,
      },
    };
  }

  if (error?.code === "VALIDATION_ERROR") {
    const errors = fieldErrorsFromDetails(error.details);
    if (Object.keys(errors).length > 0) return { kind: "invalid", errors };
  }

  return {
    kind: "failed",
    message: response.status === 429 ? TOO_MANY_REQUESTS : SUBMISSION_FAILED,
  };
}
