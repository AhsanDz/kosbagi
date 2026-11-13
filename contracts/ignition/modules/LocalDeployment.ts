import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { sha256, toUtf8Bytes } from "ethers";

/**
 * Deploy KosToken dan KosLedger studi kasus KB-SMR01 ke jaringan Hardhat lokal.
 *
 * Empat akun pertama jaringan lokal dipakai sebagai admin, operator, pemilik lama,
 * dan perbendaharaan. Modul ini hanya untuk lokal karena jaringan Sepolia di
 * hardhat.config.ts hanya punya satu akun; modul Sepolia dibuat di P3.
 * Semua parameter bisa ditimpa lewat file parameter Ignition (--parameters).
 */
export default buildModule("KosBagiLocal", (m) => {
  const admin = m.getAccount(0);
  const operator = m.getAccount(1);
  const originalOwner = m.getAccount(2);
  const treasury = m.getAccount(3);

  const propertyCode = m.getParameter("propertyCode", "SMR01");
  // Hash dokumen dummy. Pada deploy sungguhan: SHA-256 isi file PDF dokumen.
  const certificateHash = m.getParameter("certificateHash", sha256(toUtf8Bytes("dummy: sertifikat Kos Sumbersari 01")));
  const appraisalReportHash = m.getParameter(
    "appraisalReportHash",
    sha256(toUtf8Bytes("dummy: laporan penilaian Kos Sumbersari 01 tahun 2026")),
  );
  const originalOwnerAllocation = m.getParameter("originalOwnerAllocation", 5_400n);
  const treasuryAllocation = m.getParameter("treasuryAllocation", 12_600n);
  const platformFeeBps = m.getParameter("platformFeeBps", 500n);
  const taxBps = m.getParameter("taxBps", 2_200n);

  const token = m.contract("KosToken", [
    propertyCode,
    certificateHash,
    appraisalReportHash,
    admin,
    operator,
    originalOwner,
    treasury,
    originalOwnerAllocation,
    treasuryAllocation,
  ]);

  const ledger = m.contract("KosLedger", [admin, operator, token, platformFeeBps, taxBps]);

  return { token, ledger };
});
