// Pemeriksaan otomatis yang tampil di Sheet tinjau KYC admin. Hanya membantu admin; keputusan
// tetap di tangan admin, dan pengajuan yang gagal pemeriksaan tetap bisa disetujui atau ditolak.
import type { KycSubmission } from '../../generated/prisma/client.js';

export interface KycChecks {
  /** Nomor identitas berawalan DUMMY-, jadi bukan nomor KTP asli. */
  dummyPrefix: boolean;
  /** Nama lengkap sama dengan nama akun, tanpa membedakan huruf besar kecil dan spasi di tepi. */
  nameMatchesAccount: boolean;
  /**
   * Tidak ada pengajuan lain yang masih berlaku (SUBMITTED atau APPROVED), baik dari akun yang
   * sama maupun dengan nomor identitas dummy yang sama dari akun lain.
   */
  noOtherActive: boolean;
}

export type CheckedSubmission = Pick<KycSubmission, 'id' | 'userId' | 'fullName' | 'dummyIdNumber'>;

/** Pengajuan berstatus SUBMITTED atau APPROVED, sebagai pembanding cek ketiga. */
export type ActiveSubmission = Pick<KycSubmission, 'id' | 'userId' | 'dummyIdNumber'>;

export const DUMMY_ID_PREFIX = 'DUMMY-';

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase('id-ID');
}

function normalizeIdNumber(idNumber: string): string {
  return idNumber.trim().toUpperCase();
}

export function computeKycChecks(
  submission: CheckedSubmission,
  accountName: string,
  activeSubmissions: readonly ActiveSubmission[],
): KycChecks {
  const idNumber = normalizeIdNumber(submission.dummyIdNumber);
  const otherActive = activeSubmissions.some(
    (other) =>
      other.id !== submission.id &&
      (other.userId === submission.userId || normalizeIdNumber(other.dummyIdNumber) === idNumber),
  );

  return {
    dummyPrefix: submission.dummyIdNumber.startsWith(DUMMY_ID_PREFIX),
    nameMatchesAccount: normalizeName(submission.fullName) === normalizeName(accountName),
    noOtherActive: !otherActive,
  };
}
