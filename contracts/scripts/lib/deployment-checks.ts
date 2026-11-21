import type { KosLedger, KosToken } from "../../types/ethers-contracts/index.js";
import type { WalletAddresses } from "./deploy-target.js";
import type { IssuanceDocumentType } from "./issuance-documents.js";

type WalletName = keyof WalletAddresses;

/**
 * Pembagian peran yang diharapkan setelah deploy (rancangan kontrak bagian 3.3
 * dan 4.3). Semuanya diberikan konstruktor; skrip deploy tidak memanggil
 * grantRole. Dompet yang tidak tercantum untuk suatu peran wajib TIDAK memegang
 * peran itu, termasuk pemilik lama dan perbendaharaan yang tidak memegang peran apa pun.
 */
export const EXPECTED_ROLES = {
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
} as const satisfies Record<string, Record<string, readonly WalletName[]>>;

const WALLET_NAMES: readonly WalletName[] = ["admin", "operator", "originalOwner", "treasury"];

export interface ExpectedDeployment {
  wallets: WalletAddresses;
  propertyCode: string;
  originalOwnerAllocation: bigint;
  treasuryAllocation: bigint;
  platformFeeBps: bigint;
  taxBps: bigint;
  documents: ReadonlyArray<{ type: IssuanceDocumentType; sha256: string }>;
}

export interface CheckResult {
  label: string;
  ok: boolean;
  /** Nilai yang terbaca bila tidak sesuai harapan. */
  detail: string;
}

function check(label: string, actual: unknown, expected: unknown): CheckResult {
  const ok = String(actual).toLowerCase() === String(expected).toLowerCase();
  return { label, ok, detail: ok ? "" : `terbaca ${String(actual)}, seharusnya ${String(expected)}` };
}

/**
 * Membaca ulang kontrak hasil deploy dan membandingkannya dengan yang diharapkan:
 * parameter penerbitan, saldo awal, KYC dompet awal, hubungan KosLedger ke
 * KosToken, tabel peran lengkap (yang wajib ada dan yang wajib tidak ada), dan
 * hash tiga dokumen penerbitan versi 1. Hanya membaca, tidak mengirim transaksi.
 */
export async function checkDeployment(
  token: KosToken,
  ledger: KosLedger,
  expected: ExpectedDeployment,
): Promise<CheckResult[]> {
  const { wallets } = expected;
  const supply = expected.originalOwnerAllocation + expected.treasuryAllocation;
  const results: CheckResult[] = [];

  results.push(
    check("KosToken.propertyCode", await token.propertyCode(), expected.propertyCode),
    check("KosToken.symbol", await token.symbol(), `KB-${expected.propertyCode}`),
    check("KosToken.decimals", await token.decimals(), 0n),
    check("KosToken.totalSupply", await token.totalSupply(), supply),
    check("KosToken.maxBalance", await token.maxBalance(), (supply * 1_000n) / 10_000n),
    check("KosToken.originalOwner", await token.originalOwner(), wallets.originalOwner),
    check("KosToken.treasury", await token.treasury(), wallets.treasury),
    check("Saldo pemilik lama", await token.balanceOf(wallets.originalOwner), expected.originalOwnerAllocation),
    check("Saldo perbendaharaan", await token.balanceOf(wallets.treasury), expected.treasuryAllocation),
    check("KYC pemilik lama", await token.isKycApproved(wallets.originalOwner), true),
    check("KYC perbendaharaan", await token.isKycApproved(wallets.treasury), true),
    check("KosToken.paused", await token.paused(), false),
    check("KosLedger.token", await ledger.token(), await token.getAddress()),
    check("KosLedger.platformFeeBps", await ledger.platformFeeBps(), expected.platformFeeBps),
    check("KosLedger.taxBps", await ledger.taxBps(), expected.taxBps),
    check("KosLedger.paused", await ledger.paused(), false),
  );

  const contracts = { KosToken: token, KosLedger: ledger } as const;
  for (const [contractName, roles] of Object.entries(EXPECTED_ROLES) as [keyof typeof contracts, Record<string, readonly WalletName[]>][]) {
    const contract = contracts[contractName];
    for (const [roleName, holders] of Object.entries(roles)) {
      const role = await readRole(contract, roleName);
      for (const walletName of WALLET_NAMES) {
        const expectedHas = holders.includes(walletName);
        results.push(
          check(
            `${contractName} ${roleName} ${expectedHas ? "dipegang" : "tidak dipegang"} ${walletName}`,
            await contract.hasRole(role, wallets[walletName]),
            expectedHas,
          ),
        );
      }
    }
  }

  for (const document of expected.documents) {
    const documentType = await readDocumentType(token, document.type);
    results.push(
      check(`Dokumen ${document.type} versi berlaku`, await token.currentDocumentHash(documentType), document.sha256),
      check(`Dokumen ${document.type} jumlah versi`, (await token.documentHistory(documentType)).length, 1),
    );
  }

  return results;
}

/** Membaca konstanta peran dari kontrak, mis. OPERATOR_ROLE(). */
export async function readRole(contract: KosToken | KosLedger, roleName: string): Promise<string> {
  const getter = (contract as unknown as Record<string, () => Promise<string>>)[roleName];
  if (typeof getter !== "function") throw new Error(`Kontrak tidak punya konstanta ${roleName}`);
  return getter.call(contract);
}

/** Membaca konstanta jenis dokumen dari KosToken, mis. DOCUMENT_CERTIFICATE(). */
export async function readDocumentType(token: KosToken, type: IssuanceDocumentType): Promise<string> {
  return token[type]();
}

/**
 * Mengganti nilai immutable di bytecode runtime dengan nol. Nilai immutable
 * (alamat perbendaharaan, tarif, domain EIP-712, dan sebagainya) baru diisi saat
 * deploy, jadi bagian itu selalu berbeda dari artifact hasil kompilasi.
 */
export function maskImmutables(
  bytecode: string,
  immutableReferences: Record<string, ReadonlyArray<{ start: number; length: number }>> | undefined,
): string {
  const hex = bytecode.toLowerCase().replace(/^0x/, "").split("");
  for (const references of Object.values(immutableReferences ?? {})) {
    for (const { start, length } of references) {
      hex.fill("0", start * 2, (start + length) * 2);
    }
  }
  return hex.join("");
}

/**
 * true bila bytecode di chain sama dengan artifact hasil build saat ini, di luar
 * nilai immutable. Bila build memakai profil lain (mis. `default` tanpa
 * optimizer), seluruh bytecode berbeda, jadi pemeriksaan ini menangkap penyebab
 * paling umum gagalnya verifikasi Etherscan sebelum permintaan dikirim.
 */
export function deployedBytecodeMatches(
  onchainCode: string,
  artifact: {
    deployedBytecode: string;
    immutableReferences?: Record<string, ReadonlyArray<{ start: number; length: number }>>;
  },
): boolean {
  if (onchainCode.length !== artifact.deployedBytecode.length) return false;
  return (
    maskImmutables(onchainCode, artifact.immutableReferences) ===
    maskImmutables(artifact.deployedBytecode, artifact.immutableReferences)
  );
}
