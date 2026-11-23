import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect } from "chai";
import { artifacts, network } from "hardhat";

import SepoliaDeployment from "../ignition/modules/SepoliaDeployment.js";
import {
  deploymentIdFor,
  deploymentRecordPath,
  DEPLOYMENTS_DIR,
  MODULE_ID,
  parameterFilePath,
  parseDeployLabel,
  readDeployParameters,
  resolveDeployTarget,
  validateDeployParameters,
} from "../scripts/lib/deploy-target.js";
import {
  checkDeployment,
  deployedBytecodeMatches,
  EXPECTED_ROLES,
  maskImmutables,
  type ExpectedDeployment,
} from "../scripts/lib/deployment-checks.js";
import { ConfigError } from "../scripts/lib/errors.js";
import {
  displayPath,
  hashIssuanceDocuments,
  ISSUANCE_DOCUMENTS,
  REPO_ROOT,
  sha256Hex,
} from "../scripts/lib/issuance-documents.js";

const { ethers, ignition, networkHelpers } = await network.create();

/** Menunggu promise yang seharusnya gagal dan mengembalikan error-nya. */
async function rejectionOf(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (error) {
    return error as Error;
  }
  throw new Error("Seharusnya gagal, ternyata berhasil");
}

// Hash contoh untuk test. Deploy sungguhan memakai SHA-256 file di
// docs/bisnis/dokumen-penerbitan/ yang dihitung scripts/deploy.ts saat dijalankan.
const SAMPLE_HASHES = {
  certificateHash: ethers.sha256(ethers.toUtf8Bytes("contoh: sertifikat hak milik")),
  appraisalReportHash: ethers.sha256(ethers.toUtf8Bytes("contoh: laporan penilaian")),
  managementAgreementHash: ethers.sha256(ethers.toUtf8Bytes("contoh: perjanjian pengelolaan")),
};

const ISSUANCE = {
  originalOwnerAllocation: 5_400n,
  treasuryAllocation: 12_600n,
  platformFeeBps: 500n,
  taxBps: 2_200n,
};

async function moduleParameters() {
  const [admin, operator, originalOwner, treasury] = await ethers.getSigners();
  return {
    wallets: {
      admin: admin.address,
      operator: operator.address,
      originalOwner: originalOwner.address,
      treasury: treasury.address,
    },
    parameters: {
      [MODULE_ID]: {
        admin: admin.address,
        operator: operator.address,
        originalOwner: originalOwner.address,
        treasury: treasury.address,
        propertyCode: "SMR01",
        ...ISSUANCE,
        ...SAMPLE_HASHES,
      },
    },
  };
}

async function deploySepoliaModuleFixture() {
  const { wallets, parameters } = await moduleParameters();
  const deployed = await ignition.deploy(SepoliaDeployment, { parameters, defaultSender: wallets.admin });
  const token = await ethers.getContractAt("KosToken", await deployed.token.getAddress());
  const ledger = await ethers.getContractAt("KosLedger", await deployed.ledger.getAddress());
  const expected: ExpectedDeployment = {
    wallets,
    propertyCode: "SMR01",
    ...ISSUANCE,
    documents: [
      { type: "DOCUMENT_CERTIFICATE", sha256: SAMPLE_HASHES.certificateHash },
      { type: "DOCUMENT_APPRAISAL_REPORT", sha256: SAMPLE_HASHES.appraisalReportHash },
      { type: "DOCUMENT_MANAGEMENT_AGREEMENT", sha256: SAMPLE_HASHES.managementAgreementHash },
    ],
  };
  return { token, ledger, wallets, expected };
}

describe("Modul deploy Sepolia", function () {
  it("men-deploy KosToken dan KosLedger lalu mencatat tiga dokumen penerbitan versi 1", async function () {
    const { token, ledger } = await networkHelpers.loadFixture(deploySepoliaModuleFixture);

    expect(await ledger.token()).to.equal(await token.getAddress());
    expect(await token.currentDocumentHash(await token.DOCUMENT_CERTIFICATE())).to.equal(SAMPLE_HASHES.certificateHash);
    expect(await token.currentDocumentHash(await token.DOCUMENT_APPRAISAL_REPORT())).to.equal(
      SAMPLE_HASHES.appraisalReportHash,
    );
    expect(await token.documentHistory(await token.DOCUMENT_MANAGEMENT_AGREEMENT())).to.deep.equal([
      SAMPLE_HASHES.managementAgreementHash,
    ]);
  });

  it("semua pemeriksaan pasca-deploy sesuai: parameter, saldo, KYC, peran, dan dokumen", async function () {
    const { token, ledger, expected } = await networkHelpers.loadFixture(deploySepoliaModuleFixture);

    const results = await checkDeployment(token, ledger, expected);
    const failed = results.filter((result) => !result.ok);

    expect(failed, failed.map((result) => `${result.label}: ${result.detail}`).join("\n")).to.deep.equal([]);
    // 16 parameter + (4 peran KosToken + 3 peran KosLedger) x 4 dompet + 3 dokumen x 2.
    expect(results).to.have.length(16 + 7 * 4 + 3 * 2);
  });

  it("operator memegang OPERATOR, KYC, dan PAUSER di KosToken serta OPERATOR dan PAUSER di KosLedger; admin tidak memegang peran operasional", async function () {
    const { token, ledger, wallets } = await networkHelpers.loadFixture(deploySepoliaModuleFixture);

    expect(await token.hasRole(await token.OPERATOR_ROLE(), wallets.operator)).to.equal(true);
    expect(await token.hasRole(await token.KYC_ROLE(), wallets.operator)).to.equal(true);
    expect(await token.hasRole(await token.PAUSER_ROLE(), wallets.operator)).to.equal(true);
    expect(await ledger.hasRole(await ledger.OPERATOR_ROLE(), wallets.operator)).to.equal(true);
    expect(await ledger.hasRole(await ledger.PAUSER_ROLE(), wallets.operator)).to.equal(true);

    expect(await token.hasRole(await token.PAUSER_ROLE(), wallets.admin)).to.equal(true);
    expect(await ledger.hasRole(await ledger.PAUSER_ROLE(), wallets.admin)).to.equal(true);
    expect(await token.hasRole(await token.OPERATOR_ROLE(), wallets.admin)).to.equal(false);
    expect(await token.hasRole(await token.KYC_ROLE(), wallets.admin)).to.equal(false);
    expect(await ledger.hasRole(await ledger.OPERATOR_ROLE(), wallets.admin)).to.equal(false);
    expect(await token.hasRole(await token.DEFAULT_ADMIN_ROLE(), wallets.operator)).to.equal(false);
    expect(await ledger.hasRole(await ledger.DEFAULT_ADMIN_ROLE(), wallets.operator)).to.equal(false);
  });

  it("tabel peran yang diharapkan sesuai rancangan kontrak", function () {
    expect(EXPECTED_ROLES).to.deep.equal({
      KosToken: {
        DEFAULT_ADMIN_ROLE: ["admin"],
        OPERATOR_ROLE: ["operator"],
        KYC_ROLE: ["operator"],
        PAUSER_ROLE: ["admin", "operator"],
      },
      KosLedger: {
        DEFAULT_ADMIN_ROLE: ["admin"],
        OPERATOR_ROLE: ["operator"],
        PAUSER_ROLE: ["admin", "operator"],
      },
    });
  });

  it("pemeriksaan pasca-deploy menangkap hash dokumen dan dompet yang tidak sesuai", async function () {
    const { token, ledger, expected } = await networkHelpers.loadFixture(deploySepoliaModuleFixture);
    const wrongHash = ethers.sha256(ethers.toUtf8Bytes("dokumen lain"));

    const results = await checkDeployment(token, ledger, {
      ...expected,
      wallets: { ...expected.wallets, operator: expected.wallets.originalOwner, originalOwner: expected.wallets.operator },
      documents: expected.documents.map((document) =>
        document.type === "DOCUMENT_APPRAISAL_REPORT" ? { ...document, sha256: wrongHash } : document,
      ),
    });
    const failedLabels = results.filter((result) => !result.ok).map((result) => result.label);

    expect(failedLabels).to.include("Dokumen DOCUMENT_APPRAISAL_REPORT versi berlaku");
    expect(failedLabels).to.include("KosToken.originalOwner");
    expect(failedLabels).to.include("KosToken OPERATOR_ROLE dipegang operator");
    expect(failedLabels).to.include("KosLedger OPERATOR_ROLE tidak dipegang originalOwner");
  });

  it("gagal bila pengirim bukan admin, karena hanya admin yang boleh mencatat dokumen", async function () {
    const { parameters, wallets } = await moduleParameters();

    const error = await rejectionOf(ignition.deploy(SepoliaDeployment, { parameters, defaultSender: wallets.operator }));

    expect(error.message).to.match(/AnchorManagementAgreement[\s\S]*AccessControlUnauthorizedAccount/);
  });

  it("gagal bila hash dokumen ketiga tidak diberikan", async function () {
    const { parameters, wallets } = await moduleParameters();
    const { managementAgreementHash: _omitted, ...withoutAgreement } = parameters[MODULE_ID];

    const error = await rejectionOf(
      ignition.deploy(SepoliaDeployment, { parameters: { [MODULE_ID]: withoutAgreement }, defaultSender: wallets.admin }),
    );

    expect(error.message).to.match(/managementAgreementHash/);
  });

  describe("Pemeriksaan bytecode untuk verifikasi", function () {
    it("bytecode hasil deploy sama dengan artifact di luar nilai immutable", async function () {
      const { token, ledger } = await networkHelpers.loadFixture(deploySepoliaModuleFixture);

      const tokenCode = await ethers.provider.getCode(await token.getAddress());
      const ledgerCode = await ethers.provider.getCode(await ledger.getAddress());

      expect(deployedBytecodeMatches(tokenCode, await artifacts.readArtifact("KosToken"))).to.equal(true);
      expect(deployedBytecodeMatches(ledgerCode, await artifacts.readArtifact("KosLedger"))).to.equal(true);
      // Tanpa masker immutable, bytecode KosToken berbeda dari artifact (alamat, domain EIP-712).
      expect(tokenCode).to.not.equal((await artifacts.readArtifact("KosToken")).deployedBytecode);
    });

    it("bytecode kontrak lain atau yang diubah satu byte ditolak", async function () {
      const { token, ledger } = await networkHelpers.loadFixture(deploySepoliaModuleFixture);
      const tokenArtifact = await artifacts.readArtifact("KosToken");
      const tokenCode = await ethers.provider.getCode(await token.getAddress());
      const ledgerCode = await ethers.provider.getCode(await ledger.getAddress());
      // Ubah satu byte di awal kode (di luar immutable).
      const tampered = `${tokenCode.slice(0, 10)}${tokenCode.slice(10, 12) === "00" ? "01" : "00"}${tokenCode.slice(12)}`;

      expect(deployedBytecodeMatches(ledgerCode, tokenArtifact)).to.equal(false);
      expect(deployedBytecodeMatches(tampered, tokenArtifact)).to.equal(false);
    });

    it("maskImmutables mengenolkan rentang byte yang ditunjuk", function () {
      expect(maskImmutables("0xAABBCCDDEE", { "1": [{ start: 1, length: 2 }], "2": [{ start: 4, length: 1 }] })).to.equal(
        "aa0000dd00",
      );
      expect(maskImmutables("0xaabb", undefined)).to.equal("aabb");
    });
  });
});

describe("Target dan parameter deploy", function () {
  const valid = {
    admin: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    operator: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
    originalOwner: "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
    treasury: "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
  };

  it("hanya Sepolia dan Hardhat lokal yang diizinkan", function () {
    expect(resolveDeployTarget(11_155_111)).to.include({ label: "sepolia", isLocal: false });
    expect(resolveDeployTarget(11_155_111).explorerUrl).to.equal("https://sepolia.etherscan.io");
    expect(resolveDeployTarget(31_337)).to.include({ label: "lokal", isLocal: true });
    expect(() => resolveDeployTarget(1)).to.throw(ConfigError, /Chain id 1 tidak didukung/);
    expect(deploymentIdFor(resolveDeployTarget(11_155_111), "SMR01")).to.equal("sepolia-smr01");
  });

  it("deploy gladi berlabel memakai id deployment dan berkas hasil sendiri, tanpa label tetap deploy utama", function () {
    const sepolia = resolveDeployTarget(11_155_111);

    expect(deploymentIdFor(sepolia, "SMR01", "gladi1")).to.equal("sepolia-smr01-gladi1");
    expect(deploymentRecordPath(sepolia, "gladi1")).to.equal(path.join(DEPLOYMENTS_DIR, "sepolia-gladi1.json"));
    expect(deploymentIdFor(sepolia, "SMR01", null)).to.equal("sepolia-smr01");
    expect(deploymentRecordPath(sepolia)).to.equal(path.join(DEPLOYMENTS_DIR, "sepolia.json"));
    expect(deploymentRecordPath(resolveDeployTarget(31_337), "gladi1")).to.equal(path.join(DEPLOYMENTS_DIR, "lokal-gladi1.json"));
  });

  it("DEPLOY_LABEL kosong berarti deploy utama; label hanya huruf kecil, angka, dan tanda hubung", function () {
    for (const empty of [undefined, "", "   "]) expect(parseDeployLabel(empty)).to.equal(null);
    expect(parseDeployLabel("gladi1")).to.equal("gladi1");
    expect(parseDeployLabel(" gladi-2 ")).to.equal("gladi-2");
    expect(parseDeployLabel("a".repeat(20))).to.equal("a".repeat(20));

    for (const invalid of ["Gladi1", "gladi 1", "-gladi", "gladi-", "a".repeat(21), "../gladi", "gladi_1", "gladi.1"]) {
      expect(() => parseDeployLabel(invalid), invalid).to.throw(ConfigError, /DEPLOY_LABEL .* tidak valid/);
    }
  });

  it("alamat valid dinormalkan ke bentuk checksum dan kode properti bawaan SMR01", function () {
    const result = validateDeployParameters({ [MODULE_ID]: valid }, "uji");

    expect(result).to.deep.equal({
      admin: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      operator: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      originalOwner: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      treasury: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      propertyCode: "SMR01",
    });
  });

  it("menolak alamat nol, alamat tidak valid, dan dompet yang sama", function () {
    const zero = "0x0000000000000000000000000000000000000000";
    expect(() => validateDeployParameters({ [MODULE_ID]: { ...valid, treasury: zero } }, "uji")).to.throw(
      ConfigError,
      /"treasury" masih alamat nol/,
    );
    expect(() => validateDeployParameters({ [MODULE_ID]: { ...valid, admin: "0x1234" } }, "uji")).to.throw(
      /"admin" bukan alamat/,
    );
    expect(() => validateDeployParameters({ [MODULE_ID]: { ...valid, operator: valid.admin } }, "uji")).to.throw(
      /empat alamat yang berbeda/,
    );
    expect(() => validateDeployParameters({ [MODULE_ID]: { ...valid, treasury: valid.originalOwner } }, "uji")).to.throw(
      /empat alamat yang berbeda/,
    );
  });

  it("menolak hash dokumen yang ditulis tangan, kunci lain, dan kode properti tidak valid", function () {
    expect(() =>
      validateDeployParameters({ [MODULE_ID]: { ...valid, certificateHash: SAMPLE_HASHES.certificateHash } }, "uji"),
    ).to.throw(ConfigError, /kunci tidak dikenal certificateHash/);
    expect(() => validateDeployParameters({ [MODULE_ID]: { ...valid, propertyCode: "smr-01" } }, "uji")).to.throw(
      /propertyCode/,
    );
    expect(() => validateDeployParameters({ KosBagiLocal: valid }, "uji")).to.throw(/harus berisi objek "KosBagiSepolia"/);
  });

  it("file parameter lokal memakai empat akun pertama Hardhat", async function () {
    const [admin, operator, originalOwner, treasury] = await ethers.getSigners();
    const params = await readDeployParameters(parameterFilePath(resolveDeployTarget(31_337)));

    expect(params).to.deep.equal({
      admin: admin.address,
      operator: operator.address,
      originalOwner: originalOwner.address,
      treasury: treasury.address,
      propertyCode: "SMR01",
    });
  });

  it("file parameter Sepolia berisi empat alamat yang valid atau masih placeholder alamat nol", async function () {
    const file = parameterFilePath(resolveDeployTarget(11_155_111));
    const raw = JSON.parse(await readFile(file, "utf8")) as Record<string, Record<string, string>>;
    const values = raw[MODULE_ID];
    const wallets = [values.admin, values.operator, values.originalOwner, values.treasury];

    if (wallets.every((address) => address === ethers.ZeroAddress)) {
      expect(() => validateDeployParameters(raw, file)).to.throw(/masih alamat nol/);
    } else {
      expect(() => validateDeployParameters(raw, file)).to.not.throw();
    }
  });
});

describe("Dokumen penerbitan", function () {
  let directory: string;

  beforeEach(async function () {
    directory = await mkdtemp(path.join(os.tmpdir(), "kosbagi-dokumen-"));
    for (const document of ISSUANCE_DOCUMENTS) {
      await writeFile(path.join(directory, document.fileName), `# ${document.label} (contoh uji)\n\nIsi dummy.\n`);
    }
  });

  afterEach(async function () {
    await rm(directory, { recursive: true, force: true });
  });

  it("menghitung SHA-256 tiga file dengan nama eksplisit dan mengabaikan README.md", async function () {
    await writeFile(path.join(directory, "README.md"), "# Bukan dokumen untuk dicatat\n");

    const documents = await hashIssuanceDocuments(directory);

    expect(documents.map((document) => document.type)).to.deep.equal([
      "DOCUMENT_CERTIFICATE",
      "DOCUMENT_APPRAISAL_REPORT",
      "DOCUMENT_MANAGEMENT_AGREEMENT",
    ]);
    for (const document of documents) {
      const content = await readFile(document.absolutePath);
      expect(document.sha256).to.equal(ethers.sha256(content));
      expect(document.sizeBytes).to.equal(content.length);
    }
    expect(documents.map((document) => document.fileName)).to.not.include("README.md");
  });

  it("nama file sesuai dokumen jalur 1 dan jenisnya ada di KosToken", async function () {
    const { token } = await networkHelpers.loadFixture(deploySepoliaModuleFixture);

    expect(ISSUANCE_DOCUMENTS.map((document) => document.fileName)).to.deep.equal([
      "sertifikat-hak-milik.md",
      "laporan-penilaian.md",
      "perjanjian-pengelolaan.md",
    ]);
    for (const document of ISSUANCE_DOCUMENTS) {
      expect(await token[document.type]()).to.equal(ethers.id(document.type));
    }
  });

  it("SHA-256 sama dengan nilai baku dan berawalan 0x", function () {
    // Vektor uji SHA-256 untuk teks "abc" (FIPS 180-2).
    expect(sha256Hex(Buffer.from("abc"))).to.equal(
      "0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("gagal dengan nama file yang hilang", async function () {
    await rm(path.join(directory, "laporan-penilaian.md"));

    const error = await rejectionOf(hashIssuanceDocuments(directory));

    expect(error).to.be.instanceOf(ConfigError);
    expect(error.message).to.match(/laporan-penilaian\.md/);
  });

  it("menolak file kosong, akhir baris CRLF, dan BOM", async function () {
    await writeFile(path.join(directory, "sertifikat-hak-milik.md"), "");
    expect((await rejectionOf(hashIssuanceDocuments(directory))).message).to.match(/kosong/);

    await writeFile(path.join(directory, "sertifikat-hak-milik.md"), "# Sertifikat\r\nIsi\r\n");
    expect((await rejectionOf(hashIssuanceDocuments(directory))).message).to.match(/CRLF/);

    const withBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from("# Sertifikat\n")]);
    await writeFile(path.join(directory, "sertifikat-hak-milik.md"), withBom);
    expect((await rejectionOf(hashIssuanceDocuments(directory))).message).to.match(/BOM/);
  });

  it("path dokumen di dalam repo ditulis relatif dengan garis miring", function () {
    const inside = path.join(REPO_ROOT, "docs", "bisnis", "dokumen-penerbitan", "sertifikat-hak-milik.md");

    expect(displayPath(inside)).to.equal("docs/bisnis/dokumen-penerbitan/sertifikat-hak-milik.md");
    expect(displayPath(path.join(directory, "x.md"))).to.equal(path.join(directory, "x.md"));
  });
});
