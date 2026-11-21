import type { MyKycPayload } from "@/lib/api/types";

/**
 * Keadaan halaman /investor/kyc, sama dengan varian Kartu status KYC di Figma
 * ditambah NONE (belum mengajukan) dan WALLET_FAILED (pencatatan setKycStatus
 * gagal setelah percobaan otomatis habis).
 */
export type KycViewState =
  | "NONE"
  | "SUBMITTED"
  | "REGISTERING"
  | "RECORDED"
  | "WALLET_FAILED"
  | "REJECTED";

export function resolveKycViewState({ kyc, wallet }: MyKycPayload): KycViewState {
  if (!kyc) return "NONE";
  if (kyc.status === "SUBMITTED") return "SUBMITTED";
  if (kyc.status === "REJECTED") return "REJECTED";
  if (wallet?.whitelist.status === "RECORDED") return "RECORDED";
  if (wallet?.whitelist.status === "FAILED") return "WALLET_FAILED";
  return "REGISTERING";
}

/** Nomor identitas dummy harus berawalan DUMMY-, sama dengan validasi backend. */
export const DUMMY_ID_PATTERN = /^DUMMY-[A-Za-z0-9-]{1,40}$/;

export const KYC_NAME_MAX = 120;

export interface KycFormValues {
  fullName: string;
  dummyIdNumber: string;
  confirmed: boolean;
}

export type KycFormErrors = Partial<Record<keyof KycFormValues, string>>;

/** Validasi form KYC di peramban. Pesannya sama dengan frame Figma "Form error". */
export function validateKycForm(values: KycFormValues): KycFormErrors {
  const errors: KycFormErrors = {};
  const name = values.fullName.trim();
  if (!name) errors.fullName = "Nama lengkap wajib diisi.";
  else if (name.length < 2) errors.fullName = "Nama lengkap minimal 2 karakter.";

  if (!DUMMY_ID_PATTERN.test(values.dummyIdNumber.trim())) {
    errors.dummyIdNumber =
      "Nomor identitas harus berawalan DUMMY-. Jangan memakai nomor KTP asli.";
  }

  if (!values.confirmed) errors.confirmed = "Centang pernyataan ini untuk melanjutkan.";
  return errors;
}
