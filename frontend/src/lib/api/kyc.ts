import { requestBackend } from "@/lib/api/client";
import type {
  KycListPayload,
  KycPayload,
  KycReviewPayload,
  KycStatus,
  MyKycPayload,
} from "@/lib/api/types";

/** Kunci SWR sekaligus alamat GET pengajuan milik investor yang masuk. */
export const MY_KYC_KEY = "/kyc/me";

export function fetchMyKyc(): Promise<MyKycPayload> {
  return requestBackend<MyKycPayload>(MY_KYC_KEY);
}

export interface KycSubmissionInput {
  fullName: string;
  dummyIdNumber: string;
}

/** POST /kyc: investor mengajukan data identitas dummy. */
export function submitKyc(input: KycSubmissionInput): Promise<KycPayload> {
  return requestBackend<KycPayload>("/kyc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/** Kunci SWR daftar pengajuan admin per status. */
export function kycListKey(status: KycStatus): string {
  return `/kyc?status=${status}`;
}

export function fetchKycList(key: string): Promise<KycListPayload> {
  return requestBackend<KycListPayload>(key);
}

/** POST /kyc/:id/approve: tandai disetujui, buat dompet kustodian, antrekan whitelist. */
export function approveKyc(id: string): Promise<KycReviewPayload> {
  return requestBackend<KycReviewPayload>(`/kyc/${encodeURIComponent(id)}/approve`, {
    method: "POST",
  });
}

/** POST /kyc/:id/reject dengan alasan 3 sampai 300 karakter. */
export function rejectKyc(id: string, reason: string): Promise<KycReviewPayload> {
  return requestBackend<KycReviewPayload>(`/kyc/${encodeURIComponent(id)}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
}
