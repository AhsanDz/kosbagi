// Dompet kustodian investor. Investor tidak memegang kunci dan tidak pernah menandatangani
// transaksi: semua transaksi dikirim dompet operator (jalur 3). Backend hanya butuh alamat, yang
// diturunkan dari CUSTODIAL_WALLET_MNEMONIC dengan path m/44'/60'/0'/0/<indeks>. Kunci privat
// tidak pernah disimpan di basis data maupun dicetak.
import { HDNodeWallet } from 'ethers';
import { env } from '../../config/env.js';
import type { CustodialWallet, Prisma } from '../../generated/prisma/client.js';
import {
  type ChainJobAdminDto,
  type ChainJobDto,
  latestChainTransaction,
  toChainJobAdminDto,
} from '../../lib/chain-status.js';
import { whitelistDedupeKey } from '../../queue/outbox.js';

/** Path BIP-44 akun Ethereum pertama. Indeks terakhir adalah derivation_index dompet. */
export const CUSTODIAL_BASE_PATH = "m/44'/60'/0'/0";

const INDEX_LOCK_KEY = 'custodial-wallet-index';

/** Semua akses ke mnemonic lewat objek ini supaya test bisa menirunya dengan vi.spyOn. */
export const custodialWallets = {
  /** Mnemonic, atau undefined bila belum diisi. */
  mnemonic(): string | undefined {
    return env.CUSTODIAL_WALLET_MNEMONIC;
  },
};

let cachedBase: { phrase: string; node: HDNodeWallet } | undefined;

/** Node m/44'/60'/0'/0 disimpan, karena menurunkan seed dari mnemonic sengaja lambat. */
function baseNode(mnemonic: string): HDNodeWallet {
  if (cachedBase?.phrase !== mnemonic) {
    cachedBase = { phrase: mnemonic, node: HDNodeWallet.fromPhrase(mnemonic, undefined, CUSTODIAL_BASE_PATH) };
  }
  return cachedBase.node;
}

/** Alamat (checksum EIP-55) dompet kustodian ke-`index`. */
export function deriveCustodialAddress(mnemonic: string, index: number): string {
  return baseNode(mnemonic).deriveChild(index).address;
}

/**
 * Mengembalikan dompet investor, atau membuatnya dengan indeks berikutnya. Dipanggil di dalam
 * transaksi persetujuan KYC. Kunci advisory menyerialkan pembagian indeks, supaya dua persetujuan
 * bersamaan tidak mendapat indeks yang sama.
 */
export async function ensureCustodialWallet(
  tx: Prisma.TransactionClient,
  userId: string,
  mnemonic: string,
): Promise<CustodialWallet> {
  const existing = await tx.custodialWallet.findUnique({ where: { userId } });
  if (existing) return existing;

  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${INDEX_LOCK_KEY}, 0))`;
  const { _max } = await tx.custodialWallet.aggregate({ _max: { derivationIndex: true } });
  const derivationIndex = (_max.derivationIndex ?? -1) + 1;

  return tx.custodialWallet.create({
    data: { userId, derivationIndex, address: deriveCustodialAddress(mnemonic, derivationIndex) },
  });
}

export interface WalletDto {
  address: string;
  /** Pencatatan lolos KYC di KosToken (setKycStatus). */
  whitelist: ChainJobDto;
}

/** Dompet untuk respons admin: status whitelist ditambah pesan galat terakhir dari worker. */
export interface WalletAdminDto extends WalletDto {
  whitelist: ChainJobAdminDto;
}

type WalletDb = Pick<Prisma.TransactionClient, 'custodialWallet' | 'outboxJob'>;

/**
 * Dompet beserta status whitelist-nya, per id pengguna. Pengguna tanpa dompet tidak ada di peta.
 * `lastError` hanya ikut di versi admin (loadWalletsForAdmin).
 */
export async function loadWallets(db: WalletDb, userIds: string[]): Promise<Map<string, WalletDto>> {
  const wallets = await loadWalletsForAdmin(db, userIds);
  return new Map(
    [...wallets].map(([userId, { address, whitelist }]) => [
      userId,
      { address, whitelist: { status: whitelist.status, txHash: whitelist.txHash, blockNumber: whitelist.blockNumber } },
    ]),
  );
}

/** Seperti loadWallets, dengan pesan galat terakhir worker. Hanya untuk respons peran ADMIN. */
export async function loadWalletsForAdmin(db: WalletDb, userIds: string[]): Promise<Map<string, WalletAdminDto>> {
  if (userIds.length === 0) return new Map();

  const wallets = await db.custodialWallet.findMany({ where: { userId: { in: userIds } } });
  const jobs = await db.outboxJob.findMany({
    where: { dedupeKey: { in: wallets.map((wallet) => whitelistDedupeKey(wallet.address)) } },
    include: latestChainTransaction,
  });
  const jobByKey = new Map(jobs.map((job) => [job.dedupeKey, job]));

  return new Map(
    wallets.map((wallet) => [
      wallet.userId,
      { address: wallet.address, whitelist: toChainJobAdminDto(jobByKey.get(whitelistDedupeKey(wallet.address))) },
    ]),
  );
}

/** Dompet satu pengguna, atau null. */
export async function loadWallet(db: WalletDb, userId: string): Promise<WalletDto | null> {
  return (await loadWallets(db, [userId])).get(userId) ?? null;
}
