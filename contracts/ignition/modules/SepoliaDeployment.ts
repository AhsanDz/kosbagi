import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploy KosToken dan KosLedger satu properti (KB-SMR01) ke Sepolia, lalu mencatat
 * dokumen penerbitan ketiga.
 *
 * Dijalankan lewat `scripts/deploy.ts`, bukan langsung dengan `ignition deploy`,
 * karena skrip itu yang menghitung SHA-256 tiga dokumen penerbitan dari
 * docs/bisnis/dokumen-penerbitan/ saat dijalankan, memeriksa alamat dompet, lalu
 * menulis contracts/deployments/sepolia.json. Modul yang sama dipakai untuk gladi
 * di Hardhat node lokal (port 8546) dan di test.
 *
 * Semua transaksi dikirim akun pengirim bawaan, yaitu dompet admin (skrip deploy
 * mengisi `defaultSender` dengan alamat `admin`):
 * 1. deploy KosToken. Konstruktor mencatat sertifikat dan laporan penilaian versi 1,
 *    mencetak 5.400 token ke pemilik lama dan 12.600 ke perbendaharaan, lalu memberi
 *    peran: admin DEFAULT_ADMIN_ROLE + PAUSER_ROLE, operator OPERATOR_ROLE +
 *    KYC_ROLE + PAUSER_ROLE;
 * 2. deploy KosLedger yang terhubung ke KosToken. Konstruktor memberi admin
 *    DEFAULT_ADMIN_ROLE + PAUSER_ROLE dan operator OPERATOR_ROLE + PAUSER_ROLE;
 * 3. `anchorDocument(DOCUMENT_MANAGEMENT_AGREEMENT, hash)` dari dompet admin.
 *
 * Parameter tanpa nilai bawaan wajib diisi: empat alamat (dari
 * ignition/parameters/<jaringan>.json) dan tiga hash dokumen (dihitung skrip).
 */
export default buildModule("KosBagiSepolia", (m) => {
  const admin = m.getParameter<string>("admin");
  const operator = m.getParameter<string>("operator");
  const originalOwner = m.getParameter<string>("originalOwner");
  const treasury = m.getParameter<string>("treasury");

  const propertyCode = m.getParameter("propertyCode", "SMR01");
  const originalOwnerAllocation = m.getParameter("originalOwnerAllocation", 5_400n);
  const treasuryAllocation = m.getParameter("treasuryAllocation", 12_600n);
  const platformFeeBps = m.getParameter("platformFeeBps", 500n);
  const taxBps = m.getParameter("taxBps", 2_200n);

  // SHA-256 isi file dokumen, bytes32 berawalan 0x.
  const certificateHash = m.getParameter<string>("certificateHash");
  const appraisalReportHash = m.getParameter<string>("appraisalReportHash");
  const managementAgreementHash = m.getParameter<string>("managementAgreementHash");

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

  // Jenis dokumen dibaca dari konstanta kontrak, bukan ditulis ulang di sini.
  const managementAgreementType = m.staticCall(token, "DOCUMENT_MANAGEMENT_AGREEMENT", [], 0, {
    id: "ManagementAgreementType",
  });
  m.call(token, "anchorDocument", [managementAgreementType, managementAgreementHash], {
    id: "AnchorManagementAgreement",
  });

  return { token, ledger };
});
