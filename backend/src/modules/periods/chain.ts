// Pembaca kontrak untuk server API (P4): angka periode di KosLedger dan saldo pemegang di KosToken
// pada blok snapshot. Hanya membaca (eth_call); server API tidak pernah mengirim transaksi, jadi
// tidak butuh kunci operator. Koneksi memakai ekspor P3 jalur 3 (createChainConnection, KosContracts).
//
// Variabel yang dipakai: SEPOLIA_RPC_URL (+ SEPOLIA_RPC_URL_FALLBACK), CHAIN_ID, KOS_TOKEN_ADDRESS,
// KOS_LEDGER_ADDRESS. Bila salah satu belum diisi, pembacaan gagal dengan ChainUnavailableError dan
// endpoint membalas 502 CHAIN_UNAVAILABLE.
import { getAddress } from 'ethers';
import { KosContracts } from '../../blockchain/contracts.js';
import { createChainConnection } from '../../blockchain/provider.js';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { toChainPeriod } from '../../queue/jobs.js';
import type { ClosedPeriodFigures } from './receipt.js';

const READ_TIMEOUT_MS = 10_000;

/** Kontrak tidak bisa dibaca: belum dikonfigurasi, RPC mati, atau jawabannya tidak masuk akal. */
export class ChainUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ChainUnavailableError';
  }
}

export interface LedgerPeriod extends ClosedPeriodFigures {
  closed: boolean;
}

export interface TokenHolders {
  propertyCode: string;
  originalOwner: string;
  treasury: string;
}

/** Fungsi baca yang dipakai distribusi. Antarmuka terpisah supaya mudah ditiru di test. */
export interface LedgerReader {
  /** KosLedger.periods(period). */
  readPeriod(period: string): Promise<LedgerPeriod>;
  /** Kode properti, dompet pemilik lama, dan dompet perbendaharaan dari KosToken. */
  readHolders(): Promise<TokenHolders>;
  /** KosToken.getPastVotes(alamat, blok) untuk setiap alamat, urutan sama dengan masukan. */
  pastBalances(addresses: readonly string[], block: bigint): Promise<bigint[]>;
}

export interface LedgerReaderConfig {
  rpcUrls: readonly string[];
  chainId: number;
  tokenAddress: string;
  ledgerAddress: string;
  timeoutMs?: number;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('RPC tidak menjawab dalam batas waktu.')), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Pesan galat tanpa URL RPC, karena URL Alchemy atau Infura memuat API key. */
function unavailable(what: string, error: unknown): ChainUnavailableError {
  logger.warn({ what, err: error instanceof Error ? error.name : String(error) }, 'Kontrak gagal dibaca');
  return new ChainUnavailableError(`${what} gagal dibaca dari blockchain.`, { cause: error });
}

/** Membuat pembaca dari konfigurasi eksplisit, mis. Hardhat node lokal di test. */
export function createLedgerReader(config: LedgerReaderConfig): LedgerReader & { destroy(): void } {
  const connection = createChainConnection(config.rpcUrls, config.chainId);
  const contracts = new KosContracts(
    getAddress(config.tokenAddress.toLowerCase()),
    getAddress(config.ledgerAddress.toLowerCase()),
    connection.provider,
  );
  const timeoutMs = config.timeoutMs ?? READ_TIMEOUT_MS;

  return {
    async readPeriod(period) {
      try {
        const record = await withTimeout(
          contracts.ledger.getFunction('periods').staticCall(toChainPeriod(period)),
          timeoutMs,
        );
        return {
          grossRentIdr: BigInt(record.grossRent),
          totalExpensesIdr: BigInt(record.totalExpenses),
          platformFeeIdr: BigInt(record.platformFee),
          taxIdr: BigInt(record.tax),
          netRentIdr: BigInt(record.netRent),
          totalSupply: Number(record.totalSupply),
          valuePerTokenSen: BigInt(record.valuePerTokenSen),
          snapshotBlock: BigInt(record.snapshotBlock),
          closed: Boolean(record.closed),
        };
      } catch (error) {
        throw unavailable(`KosLedger.periods(${toChainPeriod(period)})`, error);
      }
    },

    async readHolders() {
      try {
        const deployment = await withTimeout(contracts.readDeployment(), timeoutMs);
        return {
          propertyCode: deployment.propertyCode,
          originalOwner: deployment.originalOwner,
          treasury: deployment.treasury,
        };
      } catch (error) {
        throw unavailable('Data penerbitan KosToken', error);
      }
    },

    async pastBalances(addresses, block) {
      const balances: bigint[] = [];
      try {
        // Berurutan: jumlah dompet di prototipe kecil, dan RPC gratis membatasi permintaan beruntun.
        for (const address of addresses) {
          balances.push(
            BigInt(await withTimeout(contracts.token.getFunction('getPastVotes').staticCall(address, block), timeoutMs)),
          );
        }
      } catch (error) {
        throw unavailable(`Saldo KosToken di blok ${block}`, error);
      }
      return balances;
    },

    destroy() {
      connection.destroy();
    },
  };
}

let cached: LedgerReader | undefined;

/** Semua akses kontrak dari server API lewat objek ini, supaya test bisa menirunya dengan vi.spyOn. */
export const chainAccess = {
  /** Pembaca dari environment. Melempar ChainUnavailableError bila variabelnya belum diisi. */
  reader(): LedgerReader {
    if (cached) return cached;
    if (!env.SEPOLIA_RPC_URL || !env.KOS_TOKEN_ADDRESS || !env.KOS_LEDGER_ADDRESS) {
      throw new ChainUnavailableError(
        'Koneksi blockchain belum dikonfigurasi di server (SEPOLIA_RPC_URL, KOS_TOKEN_ADDRESS, KOS_LEDGER_ADDRESS).',
      );
    }
    cached = createLedgerReader({
      rpcUrls: env.SEPOLIA_RPC_URL_FALLBACK ? [env.SEPOLIA_RPC_URL, env.SEPOLIA_RPC_URL_FALLBACK] : [env.SEPOLIA_RPC_URL],
      chainId: env.CHAIN_ID,
      tokenAddress: env.KOS_TOKEN_ADDRESS,
      ledgerAddress: env.KOS_LEDGER_ADDRESS,
    });
    return cached;
  },
};
