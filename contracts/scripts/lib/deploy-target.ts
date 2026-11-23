import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getAddress, isAddress, ZeroAddress } from "ethers";

import { ConfigError } from "./errors.js";

/** Id modul Ignition di ignition/modules/SepoliaDeployment.ts. */
export const MODULE_ID = "KosBagiSepolia";

export interface DeployTarget {
  /** Nama dasar file parameter, file hasil deploy, dan id deployment Ignition. */
  label: "sepolia" | "lokal";
  chainId: number;
  /** true untuk Hardhat node lokal: tanpa konfirmasi, jejak Ignition lama dihapus. */
  isLocal: boolean;
  /** Penjelajah blok untuk tautan, kosong untuk jaringan lokal. */
  explorerUrl: string | null;
}

const TARGETS: readonly DeployTarget[] = [
  { label: "sepolia", chainId: 11_155_111, isLocal: false, explorerUrl: "https://sepolia.etherscan.io" },
  { label: "lokal", chainId: 31_337, isLocal: true, explorerUrl: null },
];

/**
 * Menentukan target deploy dari chain id jaringan yang tersambung.
 * Hanya Sepolia dan Hardhat lokal yang diizinkan, jadi skrip tidak mungkin
 * men-deploy ke mainnet walaupun URL RPC salah isi.
 */
export function resolveDeployTarget(chainId: number): DeployTarget {
  const target = TARGETS.find((candidate) => candidate.chainId === chainId);
  if (target === undefined) {
    throw new ConfigError(
      `Chain id ${chainId} tidak didukung. Skrip ini hanya untuk Sepolia (11155111) dan Hardhat lokal (31337); periksa SEPOLIA_RPC_URL.`,
    );
  }
  return target;
}

/** Folder hasil deploy (contracts/deployments/). */
export const DEPLOYMENTS_DIR = fileURLToPath(new URL("../../deployments/", import.meta.url));

/** Folder file parameter Ignition (contracts/ignition/parameters/). */
export const PARAMETERS_DIR = fileURLToPath(new URL("../../ignition/parameters/", import.meta.url));

/** Nama variabel environment untuk deploy gladi berlabel (lihat parseDeployLabel). */
export const DEPLOY_LABEL_VARIABLE = "DEPLOY_LABEL";

// Huruf kecil, angka, dan tanda hubung di tengah; 1 sampai 20 karakter. Label menjadi bagian
// nama folder dan nama file, jadi karakter lain ditolak.
const DEPLOY_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,18}[a-z0-9])?$/;

/**
 * Label deploy gladi dari variabel DEPLOY_LABEL, mis. `gladi1`.
 *
 * Catatan on-chain tidak ikut terhapus saat basis data di-reset (periode yang sudah ditutup,
 * saldo token investor, nota yang sudah tercatat), jadi setiap gladi demo di Sepolia memakai
 * kontrak baru (keputusan 20 Nov 2026). Dengan label, id deployment Ignition dan berkas hasilnya
 * terpisah dari deploy utama: `sepolia-smr01-<label>` dan `deployments/sepolia-<label>.json`,
 * keduanya tidak di-commit. Kosong atau tidak diisi berarti deploy utama (demo akhir) yang
 * hasilnya di-commit.
 */
export function parseDeployLabel(raw: string | undefined): string | null {
  const value = raw?.trim() ?? "";
  if (value === "") return null;
  if (!DEPLOY_LABEL_PATTERN.test(value)) {
    throw new ConfigError(
      `${DEPLOY_LABEL_VARIABLE} "${value}" tidak valid. Pakai huruf kecil, angka, dan tanda hubung, 1 sampai 20 karakter, mis. gladi1.`,
    );
  }
  return value;
}

/**
 * contracts/deployments/<label>.json, mis. deployments/sepolia.json. Deploy gladi berlabel
 * menulis deployments/sepolia-<label>.json.
 */
export function deploymentRecordPath(target: DeployTarget, deployLabel: string | null = null): string {
  return path.join(DEPLOYMENTS_DIR, deployLabel === null ? `${target.label}.json` : `${target.label}-${deployLabel}.json`);
}

/** contracts/ignition/parameters/<label>.json, mis. ignition/parameters/sepolia.json. */
export function parameterFilePath(target: DeployTarget): string {
  return path.join(PARAMETERS_DIR, `${target.label}.json`);
}

/**
 * Id deployment Ignition, mis. `sepolia-smr01`, atau `sepolia-smr01-gladi1` untuk deploy gladi
 * berlabel. Jejaknya di ignition/deployments/<id>/.
 */
export function deploymentIdFor(target: DeployTarget, propertyCode: string, deployLabel: string | null = null): string {
  const base = `${target.label}-${propertyCode.toLowerCase()}`;
  return deployLabel === null ? base : `${base}-${deployLabel}`;
}

export interface WalletAddresses {
  admin: string;
  operator: string;
  originalOwner: string;
  treasury: string;
}

export interface DeployParameters extends WalletAddresses {
  propertyCode: string;
}

const WALLET_KEYS = ["admin", "operator", "originalOwner", "treasury"] as const;
const ALLOWED_KEYS = new Set<string>([...WALLET_KEYS, "propertyCode"]);

/**
 * Memeriksa isi file parameter Ignition: `{ "KosBagiSepolia": { admin, operator,
 * originalOwner, treasury, propertyCode? } }`.
 *
 * Empat alamat wajib valid, bukan alamat nol, dan saling berbeda. Dompet admin
 * dan operator harus berbeda supaya prosedur darurat bisa dijalankan; pemilik
 * lama dan perbendaharaan harus berbeda dari keduanya supaya peran dan saldo tidak
 * bercampur. Kunci lain ditolak: hash dokumen selalu dihitung skrip dari file,
 * tidak boleh ditulis tangan di file parameter.
 */
export function validateDeployParameters(raw: unknown, source: string): DeployParameters {
  if (typeof raw !== "object" || raw === null || !(MODULE_ID in raw)) {
    throw new ConfigError(`${source} harus berisi objek "${MODULE_ID}".`);
  }
  const values = (raw as Record<string, unknown>)[MODULE_ID];
  if (typeof values !== "object" || values === null) {
    throw new ConfigError(`${source}: "${MODULE_ID}" harus berupa objek.`);
  }

  const unknownKeys = Object.keys(values).filter((key) => !ALLOWED_KEYS.has(key));
  if (unknownKeys.length > 0) {
    throw new ConfigError(
      `${source}: kunci tidak dikenal ${unknownKeys.join(", ")}. Yang boleh: ${[...ALLOWED_KEYS].join(", ")}. ` +
        "Hash dokumen dihitung skrip dari file, jangan ditulis di sini.",
    );
  }

  const record = values as Record<string, unknown>;
  const wallets = {} as WalletAddresses;
  for (const key of WALLET_KEYS) {
    const value = record[key];
    if (typeof value !== "string" || !isAddress(value)) {
      throw new ConfigError(`${source}: "${key}" bukan alamat Ethereum yang valid.`);
    }
    const address = getAddress(value);
    if (address === ZeroAddress) {
      throw new ConfigError(`${source}: "${key}" masih alamat nol. Isi dengan alamat dompet ${key} sebelum deploy.`);
    }
    wallets[key] = address;
  }

  const distinct = new Set(WALLET_KEYS.map((key) => wallets[key]));
  if (distinct.size !== WALLET_KEYS.length) {
    throw new ConfigError(`${source}: admin, operator, originalOwner, dan treasury harus empat alamat yang berbeda.`);
  }

  const propertyCode = record.propertyCode ?? "SMR01";
  if (typeof propertyCode !== "string" || !/^[A-Z0-9]{1,16}$/.test(propertyCode)) {
    throw new ConfigError(`${source}: "propertyCode" harus huruf besar atau angka, 1 sampai 16 karakter.`);
  }

  return { ...wallets, propertyCode };
}

export async function readDeployParameters(file: string): Promise<DeployParameters> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    throw new ConfigError(`File parameter tidak ditemukan: ${file}.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ConfigError(`${file} bukan JSON yang valid.`);
  }
  return validateDeployParameters(parsed, file);
}
