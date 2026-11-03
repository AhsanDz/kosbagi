import { expect } from "chai";
import type { ContractTransactionResponse } from "ethers";
import { network } from "hardhat";

import type { KosToken__factory } from "../types/ethers-contracts/index.js";

// Satu koneksi jaringan Hardhat lokal (in-process) untuk seluruh file ini.
// loadFixture memulihkan snapshot hasil deploy sebelum setiap test, jadi setiap
// test mulai dari kondisi bersih tanpa deploy ulang.
const { ethers, networkHelpers } = await network.create();

// Angka studi kasus KB-SMR01 (Kos Sumbersari 01).
const PROPERTY_CODE = "SMR01";
const OWNER_ALLOCATION = 5_400n; // 30% untuk pemilik lama
const TREASURY_ALLOCATION = 12_600n; // 70% ditawarkan ke investor
const TOTAL_SUPPLY = 18_000n; // Rp1,8 miliar / Rp100.000
const MAX_BALANCE = 1_800n; // 10% suplai

// Jenis dokumen di registri = keccak256 dari namanya (sama dengan konstanta di kontrak).
const DOCUMENT_CERTIFICATE = ethers.id("DOCUMENT_CERTIFICATE");
const DOCUMENT_APPRAISAL_REPORT = ethers.id("DOCUMENT_APPRAISAL_REPORT");
const DOCUMENT_MANAGEMENT_AGREEMENT = ethers.id("DOCUMENT_MANAGEMENT_AGREEMENT");

// Hash dokumen dummy. Di aplikasi: SHA-256 dari isi file PDF dokumen.
const CERTIFICATE_HASH = ethers.sha256(ethers.toUtf8Bytes("dummy: sertifikat Kos Sumbersari 01"));
const APPRAISAL_HASH = ethers.sha256(ethers.toUtf8Bytes("dummy: laporan penilaian Kos Sumbersari 01 tahun 2026"));
const APPRAISAL_HASH_2027 = ethers.sha256(ethers.toUtf8Bytes("dummy: laporan penilaian Kos Sumbersari 01 tahun 2027"));
const AGREEMENT_HASH = ethers.sha256(ethers.toUtf8Bytes("dummy: perjanjian pengelolaan Kos Sumbersari 01"));

/** Referensi pembelian on-chain = keccak256(order_id), sama seperti di backend. */
function ref(orderId: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(orderId));
}

/** Nomor blok tempat sebuah transaksi ditambang. */
async function blockOf(txPromise: Promise<ContractTransactionResponse>): Promise<number> {
  const receipt = await (await txPromise).wait();
  if (receipt === null) throw new Error("Receipt transaksi kosong");
  return receipt.blockNumber;
}

interface IssuanceArgs {
  propertyCode: string;
  certificateHash: string;
  appraisalReportHash: string;
  admin: string;
  operator: string;
  originalOwner: string;
  treasury: string;
  originalOwnerAllocation: bigint;
  treasuryAllocation: bigint;
}

function deployWith(factory: KosToken__factory, a: IssuanceArgs) {
  return factory.deploy(
    a.propertyCode,
    a.certificateHash,
    a.appraisalReportHash,
    a.admin,
    a.operator,
    a.originalOwner,
    a.treasury,
    a.originalOwnerAllocation,
    a.treasuryAllocation,
  );
}

async function deployKosTokenFixture() {
  const [admin, operator, originalOwner, treasury, investorA, investorB, outsider] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("KosToken");
  const args: IssuanceArgs = {
    propertyCode: PROPERTY_CODE,
    certificateHash: CERTIFICATE_HASH,
    appraisalReportHash: APPRAISAL_HASH,
    admin: admin.address,
    operator: operator.address,
    originalOwner: originalOwner.address,
    treasury: treasury.address,
    originalOwnerAllocation: OWNER_ALLOCATION,
    treasuryAllocation: TREASURY_ALLOCATION,
  };
  const token = await deployWith(factory, args);
  await token.waitForDeployment();

  const roles = {
    admin: await token.DEFAULT_ADMIN_ROLE(),
    operator: await token.OPERATOR_ROLE(),
    kyc: await token.KYC_ROLE(),
    pauser: await token.PAUSER_ROLE(),
  };
  const asOperator = token.connect(operator);

  return { token, factory, args, roles, asOperator, admin, operator, originalOwner, treasury, investorA, investorB, outsider };
}

describe("KosToken", function () {
  describe("Penerbitan (deploy)", function () {
    it("memakai nama dan simbol dari kode properti serta decimals 0", async function () {
      const { token } = await networkHelpers.loadFixture(deployKosTokenFixture);

      expect(await token.name()).to.equal("KosBagi SMR01");
      expect(await token.symbol()).to.equal("KB-SMR01");
      expect(await token.decimals()).to.equal(0n);
    });

    it("mencetak 18.000 token: 5.400 ke pemilik lama dan 12.600 ke perbendaharaan", async function () {
      const { token, originalOwner, treasury } = await networkHelpers.loadFixture(deployKosTokenFixture);

      expect(await token.totalSupply()).to.equal(TOTAL_SUPPLY);
      expect(await token.balanceOf(originalOwner)).to.equal(OWNER_ALLOCATION);
      expect(await token.balanceOf(treasury)).to.equal(TREASURY_ALLOCATION);
      expect(await token.originalOwner()).to.equal(originalOwner.address);
      expect(await token.treasury()).to.equal(treasury.address);
    });

    it("menyimpan kode properti dan mencatat sertifikat serta laporan penilaian sebagai versi 1 di registri", async function () {
      const { token } = await networkHelpers.loadFixture(deployKosTokenFixture);

      expect(await token.propertyCode()).to.equal(PROPERTY_CODE);
      expect(await token.currentDocumentHash(DOCUMENT_CERTIFICATE)).to.equal(CERTIFICATE_HASH);
      expect(await token.currentDocumentHash(DOCUMENT_APPRAISAL_REPORT)).to.equal(APPRAISAL_HASH);
      expect(await token.documentHistory(DOCUMENT_CERTIFICATE)).to.deep.equal([CERTIFICATE_HASH]);
      // Perjanjian pengelolaan belum dicatat saat deploy (dicatat admin lewat anchorDocument).
      expect(await token.currentDocumentHash(DOCUMENT_MANAGEMENT_AGREEMENT)).to.equal(ethers.ZeroHash);
      expect(await token.documentHistory(DOCUMENT_MANAGEMENT_AGREEMENT)).to.deep.equal([]);
    });

    it("memancarkan event TokenIssued dan DocumentAnchored saat deploy", async function () {
      const { token, originalOwner, treasury } = await networkHelpers.loadFixture(deployKosTokenFixture);
      const deployTx = token.deploymentTransaction();

      await expect(deployTx)
        .to.emit(token, "TokenIssued")
        .withArgs(PROPERTY_CODE, originalOwner.address, treasury.address, TOTAL_SUPPLY);
      await expect(deployTx)
        .to.emit(token, "DocumentAnchored")
        .withArgs(DOCUMENT_CERTIFICATE, CERTIFICATE_HASH, ethers.ZeroHash, 1n);
      await expect(deployTx)
        .to.emit(token, "DocumentAnchored")
        .withArgs(DOCUMENT_APPRAISAL_REPORT, APPRAISAL_HASH, ethers.ZeroHash, 1n);
    });

    it("memakai konstanta jenis dokumen = keccak256 dari namanya", async function () {
      const { token } = await networkHelpers.loadFixture(deployKosTokenFixture);

      expect(await token.DOCUMENT_CERTIFICATE()).to.equal(DOCUMENT_CERTIFICATE);
      expect(await token.DOCUMENT_APPRAISAL_REPORT()).to.equal(DOCUMENT_APPRAISAL_REPORT);
      expect(await token.DOCUMENT_MANAGEMENT_AGREEMENT()).to.equal(DOCUMENT_MANAGEMENT_AGREEMENT);
    });

    it("menetapkan batas saldo 10% suplai = 1.800 token", async function () {
      const { token } = await networkHelpers.loadFixture(deployKosTokenFixture);

      expect(await token.MAX_BALANCE_BPS()).to.equal(1_000n);
      expect(await token.BPS_DENOMINATOR()).to.equal(10_000n);
      expect(await token.maxBalance()).to.equal(MAX_BALANCE);
    });

    it("memberi peran sesuai pembagian tugas admin dan operator", async function () {
      const { token, roles, admin, operator } = await networkHelpers.loadFixture(deployKosTokenFixture);

      expect(await token.hasRole(roles.admin, admin)).to.equal(true);
      expect(await token.hasRole(roles.operator, operator)).to.equal(true);
      expect(await token.hasRole(roles.kyc, operator)).to.equal(true);
      expect(await token.hasRole(roles.pauser, operator)).to.equal(true);
      // Admin memegang jeda darurat, tetapi tidak ikut menjalankan operasi harian.
      expect(await token.hasRole(roles.pauser, admin)).to.equal(true);
      expect(await token.hasRole(roles.operator, admin)).to.equal(false);
      expect(await token.hasRole(roles.kyc, admin)).to.equal(false);
      expect(await token.hasRole(roles.admin, operator)).to.equal(false);
    });

    it("langsung menandai pemilik lama dan perbendaharaan lolos KYC", async function () {
      const { token, originalOwner, treasury } = await networkHelpers.loadFixture(deployKosTokenFixture);

      expect(await token.isKycApproved(originalOwner)).to.equal(true);
      expect(await token.isKycApproved(treasury)).to.equal(true);
      const deployTx = token.deploymentTransaction();
      await expect(deployTx).to.emit(token, "KycStatusUpdated").withArgs(originalOwner.address, true);
      await expect(deployTx).to.emit(token, "KycStatusUpdated").withArgs(treasury.address, true);
    });

    it("langsung mendelegasikan suara pemilik lama dan perbendaharaan ke diri sendiri", async function () {
      const { token, originalOwner, treasury } = await networkHelpers.loadFixture(deployKosTokenFixture);

      expect(await token.delegates(originalOwner)).to.equal(originalOwner.address);
      expect(await token.delegates(treasury)).to.equal(treasury.address);
      expect(await token.getVotes(originalOwner)).to.equal(OWNER_ALLOCATION);
      expect(await token.getVotes(treasury)).to.equal(TREASURY_ALLOCATION);
    });

    describe("validasi parameter konstruktor", function () {
      it("menolak kode properti kosong", async function () {
        const { factory, args } = await networkHelpers.loadFixture(deployKosTokenFixture);

        await expect(deployWith(factory, { ...args, propertyCode: "" })).to.be.revertedWithCustomError(
          factory,
          "EmptyPropertyCode",
        );
      });

      it("menolak hash sertifikat atau laporan penilaian bernilai nol", async function () {
        const { factory, args } = await networkHelpers.loadFixture(deployKosTokenFixture);

        await expect(deployWith(factory, { ...args, certificateHash: ethers.ZeroHash })).to.be.revertedWithCustomError(
          factory,
          "EmptyDocumentHash",
        );
        await expect(
          deployWith(factory, { ...args, appraisalReportHash: ethers.ZeroHash }),
        ).to.be.revertedWithCustomError(factory, "EmptyDocumentHash");
      });

      it("menolak alamat nol untuk admin, operator, pemilik lama, dan perbendaharaan", async function () {
        const { factory, args } = await networkHelpers.loadFixture(deployKosTokenFixture);

        for (const field of ["admin", "operator", "originalOwner", "treasury"] as const) {
          await expect(deployWith(factory, { ...args, [field]: ethers.ZeroAddress }), field).to.be.revertedWithCustomError(
            factory,
            "ZeroAddress",
          );
        }
      });

      it("menolak dompet pemilik lama yang sama dengan perbendaharaan", async function () {
        const { factory, args } = await networkHelpers.loadFixture(deployKosTokenFixture);

        await expect(deployWith(factory, { ...args, treasury: args.originalOwner })).to.be.revertedWithCustomError(
          factory,
          "SameOwnerAndTreasury",
        );
      });

      it("menolak suplai di bawah 10 token karena batas 10% menjadi nol", async function () {
        const { factory, args } = await networkHelpers.loadFixture(deployKosTokenFixture);

        await expect(
          deployWith(factory, { ...args, originalOwnerAllocation: 5n, treasuryAllocation: 4n }),
        ).to.be.revertedWithCustomError(factory, "SupplyTooSmall");

        // Kasus tepi: tepat 10 token menghasilkan batas 1 token dan diterima.
        const tiny = await deployWith(factory, { ...args, originalOwnerAllocation: 5n, treasuryAllocation: 5n });
        expect(await tiny.maxBalance()).to.equal(1n);
      });
    });
  });

  describe("KYC", function () {
    it("operator (KYC_ROLE) bisa meloloskan dan mencabut KYC sebuah alamat", async function () {
      const { token, asOperator, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);

      expect(await token.isKycApproved(investorA)).to.equal(false);
      await expect(asOperator.setKycStatus(investorA, true))
        .to.emit(token, "KycStatusUpdated")
        .withArgs(investorA.address, true);
      expect(await token.isKycApproved(investorA)).to.equal(true);

      await expect(asOperator.setKycStatus(investorA, false))
        .to.emit(token, "KycStatusUpdated")
        .withArgs(investorA.address, false);
      expect(await token.isKycApproved(investorA)).to.equal(false);
    });

    it("menolak pemanggil tanpa KYC_ROLE, termasuk admin", async function () {
      const { token, roles, admin, outsider, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);

      for (const caller of [outsider, admin]) {
        await expect(token.connect(caller).setKycStatus(investorA, true))
          .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
          .withArgs(caller.address, roles.kyc);
      }
    });

    it("menolak alamat nol", async function () {
      const { token, asOperator } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await expect(asOperator.setKycStatus(ethers.ZeroAddress, true)).to.be.revertedWithCustomError(token, "ZeroAddress");
    });

    it("aman dipanggil ulang dengan status yang sama (retry job tidak gagal)", async function () {
      const { token, asOperator, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await asOperator.setKycStatus(investorA, true);
      await expect(asOperator.setKycStatus(investorA, true)).to.emit(token, "KycStatusUpdated");
      expect(await token.isKycApproved(investorA)).to.equal(true);
    });

    it("menolak transfer ke penerima yang belum lolos KYC", async function () {
      const { token, asOperator, originalOwner, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await expect(asOperator.transferFromTreasury(investorA, 10n, ref("BUY-SMR01-0001")))
        .to.be.revertedWithCustomError(token, "RecipientNotKycApproved")
        .withArgs(investorA.address);
      await expect(token.connect(originalOwner).transfer(investorA, 10n))
        .to.be.revertedWithCustomError(token, "RecipientNotKycApproved")
        .withArgs(investorA.address);
    });

    it("pemegang yang KYC-nya dicabut tidak bisa menerima lagi, tetapi tetap bisa mengembalikan token", async function () {
      const { token, asOperator, treasury, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await asOperator.setKycStatus(investorA, true);
      await asOperator.transferFromTreasury(investorA, 100n, ref("BUY-SMR01-0001"));
      await asOperator.setKycStatus(investorA, false);

      await expect(asOperator.transferFromTreasury(investorA, 1n, ref("BUY-SMR01-0002")))
        .to.be.revertedWithCustomError(token, "RecipientNotKycApproved")
        .withArgs(investorA.address);
      await expect(token.connect(investorA).transfer(treasury, 100n)).to.changeTokenBalances(
        ethers,
        token,
        [investorA, treasury],
        [-100n, 100n],
      );
    });
  });

  describe("Registri dokumen", function () {
    it("admin mencatat perjanjian pengelolaan sebagai versi 1", async function () {
      const { token, admin } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await expect(token.connect(admin).anchorDocument(DOCUMENT_MANAGEMENT_AGREEMENT, AGREEMENT_HASH))
        .to.emit(token, "DocumentAnchored")
        .withArgs(DOCUMENT_MANAGEMENT_AGREEMENT, AGREEMENT_HASH, ethers.ZeroHash, 1n);
      expect(await token.currentDocumentHash(DOCUMENT_MANAGEMENT_AGREEMENT)).to.equal(AGREEMENT_HASH);
    });

    it("laporan penilaian baru menggantikan versi lama tanpa menghapus riwayatnya", async function () {
      const { token, admin } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await expect(token.connect(admin).anchorDocument(DOCUMENT_APPRAISAL_REPORT, APPRAISAL_HASH_2027))
        .to.emit(token, "DocumentAnchored")
        .withArgs(DOCUMENT_APPRAISAL_REPORT, APPRAISAL_HASH_2027, APPRAISAL_HASH, 2n);
      expect(await token.currentDocumentHash(DOCUMENT_APPRAISAL_REPORT)).to.equal(APPRAISAL_HASH_2027);
      expect(await token.documentHistory(DOCUMENT_APPRAISAL_REPORT)).to.deep.equal([APPRAISAL_HASH, APPRAISAL_HASH_2027]);
    });

    it("menerima jenis dokumen baru di luar tiga konstanta", async function () {
      const { token, admin } = await networkHelpers.loadFixture(deployKosTokenFixture);
      const buildingPermit = ethers.id("DOCUMENT_BUILDING_PERMIT");
      const permitHash = ethers.sha256(ethers.toUtf8Bytes("dummy: PBG Kos Sumbersari 01"));

      await token.connect(admin).anchorDocument(buildingPermit, permitHash);
      expect(await token.currentDocumentHash(buildingPermit)).to.equal(permitHash);
    });

    it("menolak hash yang sama dengan versi berlaku", async function () {
      const { token, admin } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await expect(token.connect(admin).anchorDocument(DOCUMENT_CERTIFICATE, CERTIFICATE_HASH))
        .to.be.revertedWithCustomError(token, "DocumentAlreadyAnchored")
        .withArgs(DOCUMENT_CERTIFICATE, CERTIFICATE_HASH);
    });

    it("menolak jenis dokumen nol dan hash nol", async function () {
      const { token, admin } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await expect(token.connect(admin).anchorDocument(ethers.ZeroHash, AGREEMENT_HASH)).to.be.revertedWithCustomError(
        token,
        "EmptyDocumentType",
      );
      await expect(
        token.connect(admin).anchorDocument(DOCUMENT_MANAGEMENT_AGREEMENT, ethers.ZeroHash),
      ).to.be.revertedWithCustomError(token, "EmptyDocumentHash");
    });

    it("menolak pemanggil selain admin, termasuk operator", async function () {
      const { token, roles, operator, outsider } = await networkHelpers.loadFixture(deployKosTokenFixture);

      for (const caller of [operator, outsider]) {
        await expect(token.connect(caller).anchorDocument(DOCUMENT_MANAGEMENT_AGREEMENT, AGREEMENT_HASH))
          .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
          .withArgs(caller.address, roles.admin);
      }
    });
  });

  describe("Batas kepemilikan 10% (1.800 token)", function () {
    it("Skenario 10: penerima yang memegang 1.500 token lalu menerima 301 token ditolak", async function () {
      const { token, asOperator, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await asOperator.setKycStatus(investorA, true);
      await asOperator.transferFromTreasury(investorA, 1_500n, ref("BUY-SMR01-0001"));

      await expect(asOperator.transferFromTreasury(investorA, 301n, ref("BUY-SMR01-0002")))
        .to.be.revertedWithCustomError(token, "BalanceCapExceeded")
        .withArgs(investorA.address, 1_801n, MAX_BALANCE);
      expect(await token.balanceOf(investorA)).to.equal(1_500n);
    });

    it("Skenario 10 lewat transfer antarpemegang: 1.500 + 301 juga ditolak", async function () {
      const { token, asOperator, investorA, investorB } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await asOperator.setKycStatus(investorA, true);
      await asOperator.setKycStatus(investorB, true);
      await asOperator.transferFromTreasury(investorA, 1_500n, ref("BUY-SMR01-0001"));
      await asOperator.transferFromTreasury(investorB, 301n, ref("BUY-SMR01-0002"));

      await expect(token.connect(investorB).transfer(investorA, 301n))
        .to.be.revertedWithCustomError(token, "BalanceCapExceeded")
        .withArgs(investorA.address, 1_801n, MAX_BALANCE);
    });

    it("Skenario 10 batas atas: 1.500 + 300 = tepat 1.800 token masih diterima", async function () {
      const { token, asOperator, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await asOperator.setKycStatus(investorA, true);
      await asOperator.transferFromTreasury(investorA, 1_500n, ref("BUY-SMR01-0001"));
      await asOperator.transferFromTreasury(investorA, 300n, ref("BUY-SMR01-0002"));

      expect(await token.balanceOf(investorA)).to.equal(MAX_BALANCE);
    });

    it("menolak 1.801 token sekaligus ke dompet yang masih kosong", async function () {
      const { token, asOperator, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await asOperator.setKycStatus(investorA, true);
      await expect(asOperator.transferFromTreasury(investorA, 1_801n, ref("BUY-SMR01-0001")))
        .to.be.revertedWithCustomError(token, "BalanceCapExceeded")
        .withArgs(investorA.address, 1_801n, MAX_BALANCE);
    });

    it("transfer ke diri sendiri tidak dihitung ganda", async function () {
      const { token, asOperator, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await asOperator.setKycStatus(investorA, true);
      await asOperator.transferFromTreasury(investorA, 1_500n, ref("BUY-SMR01-0001"));

      await expect(token.connect(investorA).transfer(investorA, 1_500n)).to.changeTokenBalance(
        ethers,
        token,
        investorA,
        0n,
      );
    });

    it("dompet perbendaharaan dikecualikan dari batas", async function () {
      const { token, originalOwner, treasury } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await token.connect(originalOwner).transfer(treasury, OWNER_ALLOCATION);
      expect(await token.balanceOf(treasury)).to.equal(TOTAL_SUPPLY);
    });

    it("dompet pemilik lama dikecualikan dari batas", async function () {
      const { token, originalOwner, treasury } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await token.connect(treasury).transfer(originalOwner, 2_000n);
      expect(await token.balanceOf(originalOwner)).to.equal(OWNER_ALLOCATION + 2_000n);
    });
  });

  describe("transferFromTreasury", function () {
    it("operator memindahkan token dari perbendaharaan tanpa tanda tangan dompet perbendaharaan", async function () {
      const { token, asOperator, treasury, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);
      const purchaseRef = ref("BUY-SMR01-0001");

      await asOperator.setKycStatus(investorA, true);
      const tx = asOperator.transferFromTreasury(investorA, 100n, purchaseRef);

      await expect(tx).to.changeTokenBalances(ethers, token, [treasury, investorA], [-100n, 100n]);
      await expect(tx).to.emit(token, "TreasuryTransfer").withArgs(purchaseRef, investorA.address, 100n);
      await expect(tx).to.emit(token, "Transfer").withArgs(treasury.address, investorA.address, 100n);
      expect(await token.isPurchaseRefUsed(purchaseRef)).to.equal(true);
    });

    it("menolak pemanggil tanpa OPERATOR_ROLE, termasuk admin dan dompet perbendaharaan sendiri", async function () {
      const { token, asOperator, roles, admin, treasury, outsider, investorA } =
        await networkHelpers.loadFixture(deployKosTokenFixture);

      await asOperator.setKycStatus(investorA, true);
      for (const caller of [outsider, admin, treasury]) {
        await expect(token.connect(caller).transferFromTreasury(investorA, 100n, ref("BUY-SMR01-0001")))
          .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
          .withArgs(caller.address, roles.operator);
      }
    });

    it("menolak referensi pembelian yang sudah dipakai (token tidak terkirim dua kali)", async function () {
      const { token, asOperator, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);
      const purchaseRef = ref("BUY-SMR01-0001");

      await asOperator.setKycStatus(investorA, true);
      await asOperator.transferFromTreasury(investorA, 100n, purchaseRef);

      await expect(asOperator.transferFromTreasury(investorA, 100n, purchaseRef))
        .to.be.revertedWithCustomError(token, "PurchaseRefAlreadyUsed")
        .withArgs(purchaseRef);
      expect(await token.balanceOf(investorA)).to.equal(100n);
    });

    it("menolak referensi nol dan jumlah nol", async function () {
      const { token, asOperator, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await asOperator.setKycStatus(investorA, true);
      await expect(asOperator.transferFromTreasury(investorA, 100n, ethers.ZeroHash)).to.be.revertedWithCustomError(
        token,
        "EmptyPurchaseRef",
      );
      await expect(asOperator.transferFromTreasury(investorA, 0n, ref("BUY-SMR01-0001"))).to.be.revertedWithCustomError(
        token,
        "ZeroAmount",
      );
    });

    it("menolak bila sisa token perbendaharaan tidak cukup", async function () {
      const { token, asOperator, treasury, originalOwner } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await expect(asOperator.transferFromTreasury(originalOwner, TREASURY_ALLOCATION + 1n, ref("BUY-SMR01-0001")))
        .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
        .withArgs(treasury.address, TREASURY_ALLOCATION, TREASURY_ALLOCATION + 1n);
    });

    it("menolak alamat penerima nol", async function () {
      const { token, asOperator } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await expect(asOperator.transferFromTreasury(ethers.ZeroAddress, 1n, ref("BUY-SMR01-0001")))
        .to.be.revertedWithCustomError(token, "ERC20InvalidReceiver")
        .withArgs(ethers.ZeroAddress);
    });

    it("referensi tetap belum terpakai bila transaksi gagal, sehingga job bisa diulang", async function () {
      const { token, asOperator, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);
      const purchaseRef = ref("BUY-SMR01-0001");

      // Gagal karena investor belum lolos KYC: seluruh transaksi dibatalkan.
      await expect(asOperator.transferFromTreasury(investorA, 100n, purchaseRef)).to.be.revertedWithCustomError(
        token,
        "RecipientNotKycApproved",
      );
      expect(await token.isPurchaseRefUsed(purchaseRef)).to.equal(false);

      await asOperator.setKycStatus(investorA, true);
      await asOperator.transferFromTreasury(investorA, 100n, purchaseRef);
      expect(await token.balanceOf(investorA)).to.equal(100n);
    });
  });

  describe("Jeda darurat (Pausable)", function () {
    it("operator (PAUSER_ROLE) bisa menjeda dan melanjutkan", async function () {
      const { token, asOperator, operator } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await expect(asOperator.pause()).to.emit(token, "Paused").withArgs(operator.address);
      expect(await token.paused()).to.equal(true);
      await expect(asOperator.unpause()).to.emit(token, "Unpaused").withArgs(operator.address);
      expect(await token.paused()).to.equal(false);
    });

    it("jeda memblokir transfer, transferFrom, dan transferFromTreasury", async function () {
      const { token, asOperator, operator, originalOwner, treasury, investorA } =
        await networkHelpers.loadFixture(deployKosTokenFixture);

      await asOperator.setKycStatus(investorA, true);
      await token.connect(originalOwner).approve(operator, 10n);
      await asOperator.pause();

      await expect(token.connect(originalOwner).transfer(treasury, 10n)).to.be.revertedWithCustomError(
        token,
        "EnforcedPause",
      );
      await expect(asOperator.transferFrom(originalOwner, treasury, 10n)).to.be.revertedWithCustomError(
        token,
        "EnforcedPause",
      );
      await expect(asOperator.transferFromTreasury(investorA, 10n, ref("BUY-SMR01-0001"))).to.be.revertedWithCustomError(
        token,
        "EnforcedPause",
      );
    });

    it("transfer kembali berjalan setelah jeda diakhiri", async function () {
      const { token, asOperator, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await asOperator.setKycStatus(investorA, true);
      await asOperator.pause();
      await asOperator.unpause();

      await asOperator.transferFromTreasury(investorA, 10n, ref("BUY-SMR01-0001"));
      expect(await token.balanceOf(investorA)).to.equal(10n);
    });

    it("menolak pemanggil tanpa PAUSER_ROLE, termasuk dompet perbendaharaan", async function () {
      const { token, asOperator, roles, treasury, outsider } = await networkHelpers.loadFixture(deployKosTokenFixture);

      for (const caller of [outsider, treasury]) {
        await expect(token.connect(caller).pause())
          .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
          .withArgs(caller.address, roles.pauser);
      }
      await asOperator.pause();
      for (const caller of [outsider, treasury]) {
        await expect(token.connect(caller).unpause())
          .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
          .withArgs(caller.address, roles.pauser);
      }
    });

    it("admin juga memegang PAUSER_ROLE sehingga bisa menjeda dan melanjutkan sendiri", async function () {
      const { token, admin } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await expect(token.connect(admin).pause()).to.emit(token, "Paused").withArgs(admin.address);
      expect(await token.paused()).to.equal(true);
      await expect(token.connect(admin).unpause()).to.emit(token, "Unpaused").withArgs(admin.address);
    });

    it("prosedur darurat: admin menjeda lalu mencabut semua peran operator yang bocor", async function () {
      const { token, asOperator, roles, admin, operator, outsider, investorA } =
        await networkHelpers.loadFixture(deployKosTokenFixture);
      const asAdmin = token.connect(admin);

      // 1. Jeda dulu supaya tidak ada token yang bisa dipindahkan.
      await asAdmin.pause();
      // 2. Cabut ketiga peran milik dompet operator yang bocor.
      for (const role of [roles.operator, roles.kyc, roles.pauser]) {
        await asAdmin.revokeRole(role, operator);
        expect(await token.hasRole(role, operator)).to.equal(false);
      }

      // Operator lama tidak bisa lagi melanjutkan jeda, mengubah KYC, atau menyalurkan token.
      await expect(asOperator.unpause())
        .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(operator.address, roles.pauser);
      await expect(asOperator.setKycStatus(investorA, true))
        .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(operator.address, roles.kyc);
      await expect(asOperator.transferFromTreasury(investorA, 1n, ref("BUY-SMR01-0001")))
        .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(operator.address, roles.operator);

      // 3. Admin memberi peran ke dompet operator baru, lalu melanjutkan.
      const newOperator = token.connect(outsider);
      for (const role of [roles.operator, roles.kyc, roles.pauser]) {
        await asAdmin.grantRole(role, outsider);
      }
      await asAdmin.unpause();
      await newOperator.setKycStatus(investorA, true);
      await newOperator.transferFromTreasury(investorA, 10n, ref("BUY-SMR01-0001"));
      expect(await token.balanceOf(investorA)).to.equal(10n);
    });

    it("menolak jeda saat sudah dijeda dan unpause saat tidak dijeda", async function () {
      const { token, asOperator } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await expect(asOperator.unpause()).to.be.revertedWithCustomError(token, "ExpectedPause");
      await asOperator.pause();
      await expect(asOperator.pause()).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("status KYC dan registri dokumen tetap bisa diubah selama jeda", async function () {
      const { token, asOperator, admin, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await asOperator.pause();
      await asOperator.setKycStatus(investorA, true);
      await token.connect(admin).anchorDocument(DOCUMENT_MANAGEMENT_AGREEMENT, AGREEMENT_HASH);
      expect(await token.isKycApproved(investorA)).to.equal(true);
      expect(await token.currentDocumentHash(DOCUMENT_MANAGEMENT_AGREEMENT)).to.equal(AGREEMENT_HASH);
    });
  });

  describe("Delegasi otomatis dan snapshot suara (ERC20Votes)", function () {
    it("dompet kustodian tanpa ETH otomatis terdelegasi ke dirinya saat pertama menerima token", async function () {
      const { token, asOperator } = await networkHelpers.loadFixture(deployKosTokenFixture);
      const custodial = ethers.Wallet.createRandom();

      expect(await ethers.provider.getBalance(custodial.address)).to.equal(0n);
      expect(await token.delegates(custodial.address)).to.equal(ethers.ZeroAddress);

      await asOperator.setKycStatus(custodial.address, true);
      await expect(asOperator.transferFromTreasury(custodial.address, 100n, ref("BUY-SMR01-0001")))
        .to.emit(token, "DelegateChanged")
        .withArgs(custodial.address, ethers.ZeroAddress, custodial.address);

      expect(await token.delegates(custodial.address)).to.equal(custodial.address);
      expect(await token.getVotes(custodial.address)).to.equal(100n);
      // Semua gas dibayar operator: dompet kustodian tetap tanpa ETH.
      expect(await ethers.provider.getBalance(custodial.address)).to.equal(0n);
    });

    it("penerimaan berikutnya tidak memicu delegasi ulang", async function () {
      const { token, asOperator, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await asOperator.setKycStatus(investorA, true);
      await asOperator.transferFromTreasury(investorA, 100n, ref("BUY-SMR01-0001"));

      await expect(asOperator.transferFromTreasury(investorA, 50n, ref("BUY-SMR01-0002"))).not.to.emit(
        token,
        "DelegateChanged",
      );
      expect(await token.getVotes(investorA)).to.equal(150n);
    });

    it("bobot suara setiap pemegang selalu sama dengan saldonya", async function () {
      const { token, asOperator, originalOwner, treasury, investorA, investorB } =
        await networkHelpers.loadFixture(deployKosTokenFixture);

      await asOperator.setKycStatus(investorA, true);
      await asOperator.setKycStatus(investorB, true);
      await asOperator.transferFromTreasury(investorA, 700n, ref("BUY-SMR01-0001"));
      await asOperator.transferFromTreasury(investorB, 400n, ref("BUY-SMR01-0002"));
      await token.connect(investorA).transfer(investorB, 250n);
      await token.connect(originalOwner).transfer(treasury, 1_000n);

      for (const holder of [originalOwner, treasury, investorA, investorB]) {
        expect(await token.getVotes(holder)).to.equal(await token.balanceOf(holder));
      }
    });

    it("getPastVotes mengembalikan saldo di blok lampau (dasar snapshot bagi hasil)", async function () {
      const { token, asOperator, treasury, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await asOperator.setKycStatus(investorA, true);
      const blockBeforeBuy = await ethers.provider.getBlockNumber();
      const block1 = await blockOf(asOperator.transferFromTreasury(investorA, 100n, ref("BUY-SMR01-0001")));
      const block2 = await blockOf(asOperator.transferFromTreasury(investorA, 50n, ref("BUY-SMR01-0002")));
      const block3 = await blockOf(token.connect(investorA).transfer(treasury, 30n));
      await networkHelpers.mine(); // getPastVotes hanya untuk blok yang sudah lewat

      expect(await token.getPastVotes(investorA, blockBeforeBuy)).to.equal(0n);
      expect(await token.getPastVotes(investorA, block1)).to.equal(100n);
      expect(await token.getPastVotes(investorA, block2)).to.equal(150n);
      expect(await token.getPastVotes(investorA, block3)).to.equal(120n);
      expect(await token.getPastVotes(treasury, block1)).to.equal(TREASURY_ALLOCATION - 100n);
      expect(await token.getPastTotalSupply(block3)).to.equal(TOTAL_SUPPLY);
    });

    it("menolak getPastVotes untuk blok yang belum lewat", async function () {
      const { token, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);
      const current = await ethers.provider.getBlockNumber();

      await expect(token.getPastVotes(investorA, current + 1)).to.be.revertedWithCustomError(
        token,
        "ERC5805FutureLookup",
      );
    });

    it("delegasi manual ke pihak lain dimatikan", async function () {
      const { token, originalOwner, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await expect(token.connect(originalOwner).delegate(investorA)).to.be.revertedWithCustomError(
        token,
        "DelegationDisabled",
      );
      await expect(
        token.delegateBySig(investorA, 0n, 0n, 27, ethers.ZeroHash, ethers.ZeroHash),
      ).to.be.revertedWithCustomError(token, "DelegationDisabled");
      expect(await token.delegates(originalOwner)).to.equal(originalOwner.address);
    });
  });

  describe("Permit (ERC-2612) untuk dompet kustodian tanpa ETH", function () {
    /** Menandatangani permit secara off-chain dengan kunci dompet kustodian (tanpa gas). */
    async function signPermit(
      token: Awaited<ReturnType<typeof deployKosTokenFixture>>["token"],
      signer: ReturnType<typeof ethers.Wallet.createRandom>,
      spender: string,
      value: bigint,
    ) {
      const deadline = BigInt(await networkHelpers.time.latest()) + 3_600n;
      const domain = {
        name: await token.name(),
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await token.getAddress(),
      };
      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      };
      const nonce = await token.nonces(signer.address);
      const signature = await signer.signTypedData(domain, types, {
        owner: signer.address,
        spender,
        value,
        nonce,
        deadline,
      });
      const { v, r, s } = ethers.Signature.from(signature);
      return { deadline, v, r, s };
    }

    it("operator bisa mengembalikan token ke perbendaharaan memakai permit dari dompet kustodian", async function () {
      const { token, asOperator, operator, treasury } = await networkHelpers.loadFixture(deployKosTokenFixture);
      const custodial = ethers.Wallet.createRandom();

      await asOperator.setKycStatus(custodial.address, true);
      await asOperator.transferFromTreasury(custodial.address, 200n, ref("BUY-SMR01-0001"));

      const { deadline, v, r, s } = await signPermit(token, custodial, operator.address, 200n);
      await asOperator.permit(custodial.address, operator.address, 200n, deadline, v, r, s);
      await expect(asOperator.transferFrom(custodial.address, treasury, 200n)).to.changeTokenBalances(
        ethers,
        token,
        [custodial.address, treasury],
        [-200n, 200n],
      );
      expect(await ethers.provider.getBalance(custodial.address)).to.equal(0n);
    });

    it("transferFrom tetap tunduk pada aturan KYC penerima", async function () {
      const { token, asOperator, operator, outsider } = await networkHelpers.loadFixture(deployKosTokenFixture);
      const custodial = ethers.Wallet.createRandom();

      await asOperator.setKycStatus(custodial.address, true);
      await asOperator.transferFromTreasury(custodial.address, 200n, ref("BUY-SMR01-0001"));
      const { deadline, v, r, s } = await signPermit(token, custodial, operator.address, 200n);
      await asOperator.permit(custodial.address, operator.address, 200n, deadline, v, r, s);

      await expect(asOperator.transferFrom(custodial.address, outsider, 200n))
        .to.be.revertedWithCustomError(token, "RecipientNotKycApproved")
        .withArgs(outsider.address);
    });

    it("permit + transferFrom tetap tunduk pada batas 10% penerima", async function () {
      const { token, asOperator, operator, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);
      const custodial = ethers.Wallet.createRandom();

      await asOperator.setKycStatus(custodial.address, true);
      await asOperator.setKycStatus(investorA, true);
      await asOperator.transferFromTreasury(custodial.address, 200n, ref("BUY-SMR01-0001"));
      await asOperator.transferFromTreasury(investorA, 1_700n, ref("BUY-SMR01-0002"));
      const { deadline, v, r, s } = await signPermit(token, custodial, operator.address, 200n);
      await asOperator.permit(custodial.address, operator.address, 200n, deadline, v, r, s);

      await expect(asOperator.transferFrom(custodial.address, investorA, 101n))
        .to.be.revertedWithCustomError(token, "BalanceCapExceeded")
        .withArgs(investorA.address, 1_801n, MAX_BALANCE);
      await asOperator.transferFrom(custodial.address, investorA, 100n);
      expect(await token.balanceOf(investorA)).to.equal(MAX_BALANCE);
    });
  });

  describe("Aturan tetap berlaku lewat approve + transferFrom pihak ketiga", function () {
    it("pihak ketiga yang punya allowance tidak bisa mengirim ke penerima tanpa KYC", async function () {
      const { token, originalOwner, outsider, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await token.connect(originalOwner).approve(outsider, 500n);
      await expect(token.connect(outsider).transferFrom(originalOwner, investorA, 100n))
        .to.be.revertedWithCustomError(token, "RecipientNotKycApproved")
        .withArgs(investorA.address);
      // Transaksi gagal sehingga allowance tidak ikut terpakai.
      expect(await token.allowance(originalOwner, outsider)).to.equal(500n);
    });

    it("pihak ketiga yang punya allowance tidak bisa membuat saldo penerima melebihi 1.800 token", async function () {
      const { token, asOperator, originalOwner, outsider, investorA } =
        await networkHelpers.loadFixture(deployKosTokenFixture);

      await asOperator.setKycStatus(investorA, true);
      await asOperator.transferFromTreasury(investorA, 1_500n, ref("BUY-SMR01-0001"));
      await token.connect(originalOwner).approve(outsider, 500n);

      await expect(token.connect(outsider).transferFrom(originalOwner, investorA, 301n))
        .to.be.revertedWithCustomError(token, "BalanceCapExceeded")
        .withArgs(investorA.address, 1_801n, MAX_BALANCE);
      await token.connect(outsider).transferFrom(originalOwner, investorA, 300n);
      expect(await token.balanceOf(investorA)).to.equal(MAX_BALANCE);
      expect(await token.allowance(originalOwner, outsider)).to.equal(200n);
    });
  });

  describe("Kontrol akses", function () {
    it("setiap fungsi tulis berperan menolak pemanggil tanpa peran", async function () {
      const { token, roles, operator, outsider, investorA } = await networkHelpers.loadFixture(deployKosTokenFixture);
      const asOutsider = token.connect(outsider);

      const cases = [
        { fn: "setKycStatus", role: roles.kyc, call: () => asOutsider.setKycStatus(investorA, true) },
        {
          fn: "transferFromTreasury",
          role: roles.operator,
          call: () => asOutsider.transferFromTreasury(investorA, 1n, ref("BUY-SMR01-0001")),
        },
        {
          fn: "anchorDocument",
          role: roles.admin,
          call: () => asOutsider.anchorDocument(DOCUMENT_MANAGEMENT_AGREEMENT, AGREEMENT_HASH),
        },
        { fn: "pause", role: roles.pauser, call: () => asOutsider.pause() },
        { fn: "unpause", role: roles.pauser, call: () => asOutsider.unpause() },
        { fn: "grantRole", role: roles.admin, call: () => asOutsider.grantRole(roles.operator, outsider) },
        { fn: "revokeRole", role: roles.admin, call: () => asOutsider.revokeRole(roles.operator, operator) },
      ];

      for (const { fn, role, call } of cases) {
        await expect(call(), fn)
          .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
          .withArgs(outsider.address, role);
      }
    });

    it("operator tidak bisa memberi peran kepada dirinya atau dompet lain", async function () {
      const { token, asOperator, roles, operator, outsider } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await expect(asOperator.grantRole(roles.operator, outsider))
        .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(operator.address, roles.admin);
      await expect(asOperator.grantRole(roles.admin, operator))
        .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(operator.address, roles.admin);
    });

    it("admin bisa menambah operator baru lalu mencabutnya kembali", async function () {
      const { token, asOperator, roles, admin, outsider, investorA } =
        await networkHelpers.loadFixture(deployKosTokenFixture);
      const newOperator = token.connect(outsider);

      await asOperator.setKycStatus(investorA, true);
      await expect(token.connect(admin).grantRole(roles.operator, outsider))
        .to.emit(token, "RoleGranted")
        .withArgs(roles.operator, outsider.address, admin.address);
      await newOperator.transferFromTreasury(investorA, 10n, ref("BUY-SMR01-0001"));
      expect(await token.balanceOf(investorA)).to.equal(10n);

      await token.connect(admin).revokeRole(roles.operator, outsider);
      await expect(newOperator.transferFromTreasury(investorA, 10n, ref("BUY-SMR01-0002")))
        .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(outsider.address, roles.operator);
    });

    it("pemegang peran bisa melepas perannya sendiri, tetapi tidak atas nama dompet lain", async function () {
      const { token, asOperator, roles, operator, outsider } = await networkHelpers.loadFixture(deployKosTokenFixture);

      await expect(token.connect(outsider).renounceRole(roles.pauser, operator)).to.be.revertedWithCustomError(
        token,
        "AccessControlBadConfirmation",
      );
      await expect(asOperator.renounceRole(roles.pauser, operator))
        .to.emit(token, "RoleRevoked")
        .withArgs(roles.pauser, operator.address, operator.address);
      await expect(asOperator.pause())
        .to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount")
        .withArgs(operator.address, roles.pauser);
    });
  });
});
