// Koneksi ke jaringan lewat RPC Alchemy atau Infura, dengan RPC cadangan bila diisi.
//
// - Satu URL: JsonRpcProvider biasa.
// - Dua URL: FallbackProvider. Permintaan dikirim ke RPC utama; bila RPC utama tidak menjawab dalam
//   batas waktu atau gagal, RPC cadangan yang dipakai. Transaksi bertanda tangan dikirim ke keduanya
//   (hash-nya sama, jadi tidak mungkin tercatat dua kali).
//
// Jaringan dipasang tetap (staticNetwork) supaya ethers tidak menanyakan chain id di setiap
// permintaan. Akibatnya kecocokan chain id harus diperiksa sendiri saat worker mulai:
// verifyChainId() menolak RPC yang menunjuk jaringan lain.
//
// Cache bawaan ethers dimatikan (cacheTimeout -1). Bawaannya, permintaan yang sama dalam 250 ms
// dijawab dari cache. Akibatnya nonce 'pending' yang dibaca job berikutnya sesaat setelah job
// sebelumnya selesai masih nonce lama, dan transaksinya ditolak "nonce has already been used".
// Ini ditemukan saat uji alur penuh di Hardhat lokal.
import { type AbstractProvider, FallbackProvider, JsonRpcProvider, Network } from 'ethers';
import { safeErrorMessage } from './errors.js';

/** Batas tunggu RPC utama sebelum RPC cadangan ikut ditanya. */
const FALLBACK_STALL_TIMEOUT_MS = 2_000;
const CHAIN_ID_TIMEOUT_MS = 10_000;
/** Nilai cacheTimeout ethers yang mematikan cache permintaan. */
const NO_CACHE = -1;

export interface ChainConnection {
  /** Provider yang dipakai worker: JsonRpcProvider atau FallbackProvider. */
  provider: AbstractProvider;
  /** Satu provider per URL, urut sama dengan rpcUrls. Untuk pemeriksaan per RPC. */
  backends: readonly JsonRpcProvider[];
  /** Menutup semua koneksi. */
  destroy(): void;
}

export function createChainConnection(rpcUrls: readonly string[], chainId: number): ChainConnection {
  if (rpcUrls.length === 0) throw new Error('Minimal satu URL RPC dibutuhkan.');
  const network = Network.from(chainId);
  // batchMaxCount 1: beberapa RPC gratis membatasi permintaan batch, jadi dikirim satu per satu.
  const backends = rpcUrls.map(
    (url) => new JsonRpcProvider(url, network, { staticNetwork: network, batchMaxCount: 1, cacheTimeout: NO_CACHE }),
  );

  const provider: AbstractProvider =
    backends.length === 1
      ? (backends[0] as JsonRpcProvider)
      : new FallbackProvider(
          backends.map((backend, index) => ({
            provider: backend,
            priority: index + 1,
            weight: 1,
            stallTimeout: FALLBACK_STALL_TIMEOUT_MS,
          })),
          network,
          // Satu jawaban cukup: RPC cadangan dipakai saat RPC utama gagal, bukan untuk voting.
          { quorum: 1, cacheTimeout: NO_CACHE },
        );

  return {
    provider,
    backends,
    destroy() {
      if (provider !== backends[0]) provider.destroy();
      for (const backend of backends) backend.destroy();
    },
  };
}

export interface RpcCheck {
  /** Urutan RPC: 0 utama, 1 cadangan. */
  index: number;
  host: string;
  status: 'OK' | 'WRONG_CHAIN' | 'UNREACHABLE';
  chainId?: number;
  error?: string;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('RPC tidak menjawab dalam batas waktu.')), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Menanyakan chain id ke setiap RPC. Melempar Error bila ada RPC yang menunjuk jaringan lain, atau
 * bila tidak ada satu pun RPC yang bisa dihubungi. RPC cadangan yang mati hanya dilaporkan.
 */
export async function verifyChainId(
  connection: ChainConnection,
  rpcUrls: readonly string[],
  expectedChainId: number,
  { timeoutMs = CHAIN_ID_TIMEOUT_MS }: { timeoutMs?: number } = {},
): Promise<RpcCheck[]> {
  const checks = await Promise.all(
    connection.backends.map(async (backend, index): Promise<RpcCheck> => {
      const host = rpcUrls[index] ? new URL(rpcUrls[index]).host : `rpc-${index}`;
      try {
        const raw = await withTimeout(backend.send('eth_chainId', []) as Promise<string>, timeoutMs);
        const chainId = Number(BigInt(raw));
        return { index, host, chainId, status: chainId === expectedChainId ? 'OK' : 'WRONG_CHAIN' };
      } catch (error) {
        return { index, host, status: 'UNREACHABLE', error: safeErrorMessage(error, rpcUrls) };
      }
    }),
  );

  const wrong = checks.filter((check) => check.status === 'WRONG_CHAIN');
  if (wrong.length > 0) {
    const detail = wrong.map((check) => `${check.index === 0 ? 'RPC utama' : 'RPC cadangan'} ${check.host} = ${check.chainId}`);
    throw new Error(
      `RPC menunjuk jaringan lain (${detail.join(', ')}), padahal CHAIN_ID ${expectedChainId}. ` +
        'Periksa SEPOLIA_RPC_URL, SEPOLIA_RPC_URL_FALLBACK, dan CHAIN_ID.',
    );
  }
  if (checks.every((check) => check.status === 'UNREACHABLE')) {
    throw new Error(
      `Tidak ada RPC yang bisa dihubungi (${checks.map((check) => `${check.host}: ${check.error}`).join('; ')}).`,
    );
  }
  return checks;
}
