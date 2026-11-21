import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline";

import { listTransactions, TransactionStatus, type Artifact } from "@nomicfoundation/ignition-core";
import type { TransactionReceipt } from "ethers";
import { formatEther, formatUnits } from "ethers";
import hre, { artifacts, network } from "hardhat";

import SepoliaDeployment from "../ignition/modules/SepoliaDeployment.js";
import {
  deploymentIdFor,
  deploymentRecordPath,
  MODULE_ID,
  parameterFilePath,
  readDeployParameters,
  resolveDeployTarget,
} from "./lib/deploy-target.js";
import { checkDeployment, EXPECTED_ROLES, readDocumentType } from "./lib/deployment-checks.js";
import { toJsonValue, writeDeploymentRecord, type DeploymentRecord } from "./lib/deployment-record.js";
import { ConfigError } from "./lib/errors.js";
import { DEFAULT_ISSUANCE_DOCS_DIR, displayPath, hashIssuanceDocuments } from "./lib/issuance-documents.js";

/*
 * Deploy KosToken + KosLedger ke Sepolia (atau gladi di Hardhat node lokal),
 * ditandatangani dompet admin. Langkah:
 *  1. pastikan build memakai profil production (bytecode yang diverifikasi);
 *  2. tentukan target dari chain id (hanya Sepolia dan Hardhat lokal);
 *  3. baca alamat dompet dari ignition/parameters/<target>.json dan cocokkan
 *     dengan akun penanda tangan (akun 1 = admin, akun 2 = operator);
 *  4. hitung SHA-256 tiga dokumen penerbitan dari file saat ini;
 *  5. cek saldo ETH admin, tampilkan ringkasan, minta konfirmasi (Sepolia);
 *  6. jalankan modul Ignition (bisa dilanjutkan bila terputus);
 *  7. baca ulang kontrak: parameter, peran, dan hash dokumen;
 *  8. tulis contracts/deployments/<target>.json.
 *
 * Perintah: `npm run deploy:sepolia` atau `npm run deploy:local` (lihat
 * docs/kontrak/deploy-sepolia.md). Skrip ini tidak pernah mencetak private key.
 */

/** Jatah dan tarif KB-SMR01, dikirim eksplisit ke modul supaya tercatat di hasil deploy. */
const ISSUANCE = {
  originalOwnerAllocation: 5_400n,
  treasuryAllocation: 12_600n,
  platformFeeBps: 500n,
  taxBps: 2_200n,
} as const;

/**
 * Perkiraan gas tiga transaksi deploy (KosToken, KosLedger, anchorDocument) pada
 * profil production, dibulatkan ke atas dari hasil gladi lokal (±4,31 juta gas).
 * Hanya untuk cek saldo awal; biaya sebenarnya dicetak di akhir.
 */
const ESTIMATED_DEPLOY_GAS = 4_500_000n;

async function main(): Promise<void> {
  // 1. Profil build. `hardhat run` memakai profil default bila tidak diminta lain,
  //    padahal Etherscan memverifikasi bytecode profil production.
  if (hre.globalOptions.buildProfile !== "production") {
    throw new ConfigError(
      "Jalankan dengan --build-profile production (npm run deploy:sepolia atau npm run deploy:local sudah memakainya).",
    );
  }

  const connection = await network.create();
  const { ethers, ignition, networkName } = connection;

  // 2. Target.
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const target = resolveDeployTarget(chainId);

  // 3. Parameter dan akun penanda tangan.
  const parameterFile = parameterFilePath(target);
  const params = await readDeployParameters(parameterFile);
  const signers = await ethers.getSigners();
  const [adminSigner, operatorSigner] = signers;
  if (adminSigner === undefined || adminSigner.address !== params.admin) {
    throw new ConfigError(
      `Akun penanda tangan pertama (${adminSigner?.address ?? "tidak ada"}) bukan alamat admin di ${parameterFile} (${params.admin}). ` +
        "Periksa ADMIN_PRIVATE_KEY.",
    );
  }
  if (operatorSigner !== undefined && operatorSigner.address !== params.operator) {
    throw new ConfigError(
      `Alamat operator di ${parameterFile} (${params.operator}) tidak sama dengan alamat dari OPERATOR_PRIVATE_KEY (${operatorSigner.address}).`,
    );
  }

  // 4. Dokumen penerbitan.
  const overrideDir = process.env.ISSUANCE_DOCS_DIR?.trim();
  if (overrideDir !== undefined && overrideDir !== "" && !target.isLocal) {
    throw new ConfigError("ISSUANCE_DOCS_DIR hanya untuk gladi lokal. Deploy Sepolia selalu membaca docs/bisnis/dokumen-penerbitan/.");
  }
  const documentsDir = overrideDir !== undefined && overrideDir !== "" ? path.resolve(overrideDir) : DEFAULT_ISSUANCE_DOCS_DIR;
  const documents = await hashIssuanceDocuments(documentsDir);
  const hashOf = (type: (typeof documents)[number]["type"]) => {
    const found = documents.find((document) => document.type === type);
    if (found === undefined) throw new Error(`Dokumen ${type} tidak terbaca`);
    return found.sha256;
  };

  // 5. Saldo, ringkasan, konfirmasi.
  const deploymentId = deploymentIdFor(target, params.propertyCode);
  const deploymentDir = path.join(hre.config.paths.ignition, "deployments", deploymentId);
  const resuming = !target.isLocal && existsSync(deploymentDir);

  const feeData = await ethers.provider.getFeeData();
  const pricePerGas = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
  const estimatedCost = ESTIMATED_DEPLOY_GAS * pricePerGas;
  const adminBalance = await ethers.provider.getBalance(params.admin);

  console.log(`\nDeploy KosBagi ${params.propertyCode} ke ${networkName} (chain ${chainId})`);
  console.log(`  Id deployment Ignition : ${deploymentId}${resuming ? " (melanjutkan jejak yang sudah ada)" : ""}`);
  console.log(`  Admin (penanda tangan) : ${params.admin}`);
  console.log(`  Operator               : ${params.operator}`);
  console.log(`  Pemilik lama           : ${params.originalOwner}`);
  console.log(`  Perbendaharaan         : ${params.treasury}`);
  console.log(`  Dokumen penerbitan     : ${documentsDir}`);
  for (const document of documents) {
    console.log(`    ${document.type.padEnd(30)} ${document.fileName.padEnd(28)} ${document.sha256}`);
  }
  console.log(`  Harga gas maksimum     : ${formatUnits(pricePerGas, "gwei")} gwei`);
  console.log(`  Perkiraan biaya        : ${formatEther(estimatedCost)} ETH (${ESTIMATED_DEPLOY_GAS} gas)`);
  console.log(`  Saldo admin            : ${formatEther(adminBalance)} ETH\n`);

  if (adminBalance < estimatedCost) {
    const message = `Saldo admin kurang dari perkiraan biaya. Isi dompet admin dengan ETH Sepolia lalu ulangi.`;
    if (!resuming) throw new ConfigError(message);
    console.warn(`Peringatan: ${message} Deploy dilanjutkan karena sebagian transaksi mungkin sudah terkirim.`);
  }

  if (!target.isLocal) {
    const confirmed = await askConfirmation(
      "Hash dokumen dan alamat di atas akan tercatat permanen. Ketik DEPLOY untuk melanjutkan: ",
    );
    if (!confirmed) throw new ConfigError("Deploy dibatalkan.");
  } else {
    // Jaringan lokal dibuat ulang setiap Hardhat node dinyalakan, jadi jejak lama tidak berlaku.
    await rm(deploymentDir, { recursive: true, force: true });
  }

  // 6. Ignition.
  const deployed = await ignition.deploy(SepoliaDeployment, {
    parameters: {
      [MODULE_ID]: {
        admin: params.admin,
        operator: params.operator,
        originalOwner: params.originalOwner,
        treasury: params.treasury,
        propertyCode: params.propertyCode,
        ...ISSUANCE,
        certificateHash: hashOf("DOCUMENT_CERTIFICATE"),
        appraisalReportHash: hashOf("DOCUMENT_APPRAISAL_REPORT"),
        managementAgreementHash: hashOf("DOCUMENT_MANAGEMENT_AGREEMENT"),
      },
    },
    defaultSender: params.admin,
    deploymentId,
    displayUi: true,
  });

  const tokenAddress = await deployed.token.getAddress();
  const ledgerAddress = await deployed.ledger.getAddress();
  const token = await ethers.getContractAt("KosToken", tokenAddress);
  const ledger = await ethers.getContractAt("KosLedger", ledgerAddress);

  // 7. Pemeriksaan pasca-deploy.
  const results = await checkDeployment(token, ledger, {
    wallets: params,
    propertyCode: params.propertyCode,
    ...ISSUANCE,
    documents,
  });
  const failed = results.filter((result) => !result.ok);
  console.log(`\nPemeriksaan pasca-deploy: ${results.length - failed.length} dari ${results.length} sesuai.`);
  for (const result of failed) console.error(`  TIDAK SESUAI  ${result.label}: ${result.detail}`);
  if (failed.length > 0) {
    throw new ConfigError("Hasil deploy tidak sesuai harapan. Jangan isi alamat ke backend; periksa rincian di atas.");
  }

  // 8. Berkas hasil deploy.
  const transactions = await listTransactions(deploymentDir, {
    loadArtifact: async (name: string) => (await artifacts.readArtifact(name)) as unknown as Artifact,
  });
  const findTx = (name: string) => {
    const found = transactions.find((tx) => tx.name === name && tx.status === TransactionStatus.SUCCESS);
    if (found === undefined) throw new Error(`Transaksi ${name} tidak ditemukan di jejak Ignition ${deploymentDir}`);
    return found;
  };
  const tokenTx = findTx("KosToken");
  const ledgerTx = findTx("KosLedger");
  const anchorTx = findTx("KosToken#anchorDocument");
  const receipts = new Map<string, TransactionReceipt>();
  for (const tx of [tokenTx, ledgerTx, anchorTx]) {
    const receipt = await ethers.provider.getTransactionReceipt(tx.txHash);
    if (receipt === null) throw new Error(`Receipt ${tx.txHash} belum tersedia dari RPC`);
    receipts.set(tx.txHash, receipt);
  }
  const receiptOf = (txHash: string) => receipts.get(txHash) as TransactionReceipt;

  const production = hre.config.solidity.profiles.production;
  const compilerSettings = production.compilers[0];
  const optimizer = compilerSettings.settings.optimizer as { enabled?: boolean; runs?: number } | undefined;

  const roleHolders = (contractName: keyof typeof EXPECTED_ROLES) =>
    Object.fromEntries(
      Object.entries(EXPECTED_ROLES[contractName]).map(([role, holders]) => [
        role,
        (holders as readonly ("admin" | "operator")[]).map((holder) => params[holder]),
      ]),
    );

  const totalGasUsed = [...receipts.values()].reduce((sum, receipt) => sum + receipt.gasUsed, 0n);
  const totalCost = [...receipts.values()].reduce((sum, receipt) => sum + receipt.gasUsed * receipt.gasPrice, 0n);

  const record: DeploymentRecord = {
    network: networkName,
    chainId,
    explorerUrl: target.explorerUrl,
    ignitionDeploymentId: deploymentId,
    recordedAt: new Date().toISOString(),
    propertyCode: params.propertyCode,
    tokenSymbol: await token.symbol(),
    compiler: {
      solc: compilerSettings.version,
      evmVersion: String(compilerSettings.settings.evmVersion),
      buildProfile: "production",
      optimizerRuns: optimizer?.enabled === true ? (optimizer.runs ?? 200) : null,
    },
    wallets: {
      admin: params.admin,
      operator: params.operator,
      originalOwner: params.originalOwner,
      treasury: params.treasury,
    },
    parameters: {
      originalOwnerAllocation: Number(ISSUANCE.originalOwnerAllocation),
      treasuryAllocation: Number(ISSUANCE.treasuryAllocation),
      platformFeeBps: Number(ISSUANCE.platformFeeBps),
      taxBps: Number(ISSUANCE.taxBps),
    },
    contracts: {
      KosToken: {
        address: tokenAddress,
        fullyQualifiedName: "contracts/KosToken.sol:KosToken",
        deployTxHash: tokenTx.txHash,
        blockNumber: receiptOf(tokenTx.txHash).blockNumber,
        gasUsed: receiptOf(tokenTx.txHash).gasUsed.toString(),
        constructorArgs: (tokenTx.params ?? []).map(toJsonValue),
      },
      KosLedger: {
        address: ledgerAddress,
        fullyQualifiedName: "contracts/KosLedger.sol:KosLedger",
        deployTxHash: ledgerTx.txHash,
        blockNumber: receiptOf(ledgerTx.txHash).blockNumber,
        gasUsed: receiptOf(ledgerTx.txHash).gasUsed.toString(),
        constructorArgs: (ledgerTx.params ?? []).map(toJsonValue),
      },
    },
    documents: await Promise.all(
      documents.map(async (document) => {
        const recordedBy = document.type === "DOCUMENT_MANAGEMENT_AGREEMENT" ? anchorTx : tokenTx;
        return {
          type: document.type,
          typeHash: await readDocumentType(token, document.type),
          label: document.label,
          file: displayPath(document.absolutePath),
          sha256: document.sha256,
          sizeBytes: document.sizeBytes,
          version: 1,
          txHash: recordedBy.txHash,
          blockNumber: receiptOf(recordedBy.txHash).blockNumber,
        };
      }),
    ),
    roles: { KosToken: roleHolders("KosToken"), KosLedger: roleHolders("KosLedger") },
    totalGasUsed: totalGasUsed.toString(),
  };

  const recordFile = deploymentRecordPath(target);
  await writeDeploymentRecord(recordFile, record);

  const link = (kind: "address" | "tx", value: string) =>
    target.explorerUrl === null ? value : `${target.explorerUrl}/${kind}/${value}`;
  console.log(`\nSelesai. Hasil deploy ditulis ke ${recordFile}`);
  console.log(`  KosToken  : ${link("address", tokenAddress)} (blok ${record.contracts.KosToken.blockNumber})`);
  console.log(`  KosLedger : ${link("address", ledgerAddress)} (blok ${record.contracts.KosLedger.blockNumber})`);
  console.log(`  Dokumen 3 : ${link("tx", anchorTx.txHash)}`);
  console.log(`  Gas total : ${totalGasUsed} (${formatEther(totalCost)} ETH)`);
  console.log("\nIsi backend/.env:");
  console.log(`  KOS_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`  KOS_LEDGER_ADDRESS=${ledgerAddress}`);
  console.log(`  CHAIN_ID=${chainId}`);
  if (!target.isLocal) console.log("\nLangkah berikutnya: npm run verify:sepolia");
}

/** Bertanya di terminal; true hanya bila jawabannya persis DEPLOY. */
async function askConfirmation(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await new Promise<string>((resolve) => {
      rl.once("close", () => resolve(""));
      rl.question(question, resolve);
    });
    return answer.trim() === "DEPLOY";
  } finally {
    rl.close();
  }
}

try {
  await main();
} catch (error) {
  // Pesan dari skrip ini sudah menjelaskan perbaikannya, jadi dicetak tanpa stack.
  // Error lain (RPC, Ignition) dicetak lengkap.
  console.error(error instanceof ConfigError ? `\nDeploy dihentikan: ${error.message}` : error);
  process.exitCode = 1;
}
