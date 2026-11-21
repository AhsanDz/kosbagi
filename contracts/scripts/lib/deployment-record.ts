import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { WalletAddresses } from "./deploy-target.js";
import type { IssuanceDocumentType } from "./issuance-documents.js";

/**
 * Isi contracts/deployments/<jaringan>.json. Ditulis `scripts/deploy.ts`, dibaca
 * `scripts/verify.ts`, dan menjadi sumber alamat untuk backend
 * (`KOS_TOKEN_ADDRESS`, `KOS_LEDGER_ADDRESS`) serta halaman publik. Semua isinya
 * data publik yang juga terlihat di Etherscan; tidak ada kunci.
 */
export interface DeploymentRecord {
  network: string;
  chainId: number;
  explorerUrl: string | null;
  ignitionDeploymentId: string;
  /** Waktu file ditulis (ISO 8601, UTC). */
  recordedAt: string;
  propertyCode: string;
  tokenSymbol: string;
  compiler: {
    solc: string;
    evmVersion: string;
    buildProfile: string;
    optimizerRuns: number | null;
  };
  wallets: WalletAddresses;
  parameters: {
    originalOwnerAllocation: number;
    treasuryAllocation: number;
    platformFeeBps: number;
    taxBps: number;
  };
  contracts: {
    KosToken: ContractRecord;
    KosLedger: ContractRecord;
  };
  documents: DocumentRecord[];
  /** Alamat pemegang tiap peran, sesuai pemeriksaan pasca-deploy. */
  roles: Record<"KosToken" | "KosLedger", Record<string, string[]>>;
  /** Total gas tiga transaksi deploy, untuk perkiraan biaya di dokumentasi. */
  totalGasUsed: string;
}

export interface ContractRecord {
  address: string;
  /** Nama lengkap untuk verifikasi, mis. contracts/KosToken.sol:KosToken. */
  fullyQualifiedName: string;
  deployTxHash: string;
  blockNumber: number;
  gasUsed: string;
  /** Argumen konstruktor persis seperti yang dikirim; bilangan ditulis sebagai string. */
  constructorArgs: unknown[];
  etherscan?: { verified: boolean; url: string; checkedAt: string };
}

export interface DocumentRecord {
  type: IssuanceDocumentType;
  /** keccak256 nama jenis, nilai konstanta di KosToken. */
  typeHash: string;
  label: string;
  /** Path relatif root repo (atau absolut bila di luar repo, hanya untuk gladi lokal). */
  file: string;
  sha256: string;
  sizeBytes: number;
  version: number;
  /** Transaksi yang mencatat versi ini: deploy KosToken untuk sertifikat dan laporan penilaian. */
  txHash: string;
  blockNumber: number;
}

/** Mengubah bigint menjadi string supaya bisa ditulis sebagai JSON. */
export function toJsonValue(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(toJsonValue);
  return value;
}

export async function writeDeploymentRecord(file: string, record: DeploymentRecord): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(record, null, 2)}\n`);
}

export async function readDeploymentRecord(file: string): Promise<DeploymentRecord> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    throw new Error(`Hasil deploy tidak ditemukan: ${file}. Jalankan skrip deploy lebih dulu.`);
  }
  return JSON.parse(text) as DeploymentRecord;
}
