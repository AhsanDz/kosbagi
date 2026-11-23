// Konfigurasi khusus worker blockchain. Server API tidak membaca file ini: hanya worker yang
// butuh RPC, kunci operator, dan alamat kontrak. Validasinya ketat supaya worker berhenti di awal
// dengan pesan jelas, bukan gagal di tengah saat mengirim transaksi pertama.
//
// Pesan error hanya menyebut nama variabel dan alasannya, tidak pernah nilainya, karena variabel
// di sini berisi private key, mnemonic, dan URL RPC yang memuat API key penyedia.
import { getAddress, Mnemonic } from 'ethers';
import '../config/env.js';
import { z } from '../lib/zod.js';
import { SEPOLIA_CHAIN_ID, SUPPORTED_CHAINS } from './networks.js';

export interface BlockchainConfig {
  chainId: number;
  /** Nama jaringan untuk log, mis. Sepolia. */
  networkName: string;
  /** RPC utama lebih dulu, lalu RPC cadangan bila ada. Rahasia: memuat API key penyedia. */
  rpcUrls: readonly string[];
  /** Rahasia. Hanya dipakai untuk membuat Wallet operator. */
  operatorPrivateKey: string;
  /** Rahasia. Kosong bila tidak diisi; worker lalu hanya mencocokkan alamat ke tabel dompet. */
  custodialMnemonic: string | undefined;
  /** Alamat kontrak dalam bentuk checksum. */
  tokenAddress: string;
  ledgerAddress: string;
}

// Baris `NAMA=` tanpa nilai di .env terbaca sebagai teks kosong; anggap belum diisi.
const blankToUndefined = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value);

const missing = (hint: string) => ({
  error: (issue: { input: unknown }) => (issue.input === undefined ? `wajib diisi untuk worker (${hint})` : undefined),
});

const rpcUrl = (hint: string) => z.preprocess(blankToUndefined, z.url({ protocol: /^https?$/, ...missing(hint) }));

const contractAddress = (hint: string) =>
  z.preprocess(
    blankToUndefined,
    z
      .string(missing(hint))
      .regex(/^0x[0-9a-fA-F]{40}$/, 'harus alamat Ethereum 0x diikuti 40 karakter heksadesimal')
      .transform((value) => getAddress(value.toLowerCase())),
  );

const schema = z
  .object({
    // Petunjuk ditulis tanpa awalan http:// supaya tidak ikut disamarkan penyaring URL di errors.ts.
    SEPOLIA_RPC_URL: rpcUrl('URL RPC Alchemy atau Infura; untuk Hardhat lokal 127.0.0.1:8545 dengan awalan http'),
    SEPOLIA_RPC_URL_FALLBACK: z.preprocess(blankToUndefined, z.url({ protocol: /^https?$/ }).optional()),
    OPERATOR_PRIVATE_KEY: z.preprocess(
      blankToUndefined,
      z
        .string(missing('private key dompet operator khusus testnet'))
        .regex(/^0x[0-9a-fA-F]{64}$/, 'harus 64 karakter heksadesimal berawalan 0x')
        .refine((value) => !/^0x0{64}$/.test(value), 'tidak boleh bernilai nol'),
    ),
    CUSTODIAL_WALLET_MNEMONIC: z.preprocess(
      blankToUndefined,
      z
        .string()
        .transform((value) => value.trim().split(/\s+/).join(' '))
        .refine((value) => Mnemonic.isValidMnemonic(value), 'bukan mnemonic BIP-39 yang valid')
        .optional(),
    ),
    KOS_TOKEN_ADDRESS: contractAddress('alamat KosToken hasil deploy'),
    KOS_LEDGER_ADDRESS: contractAddress('alamat KosLedger hasil deploy'),
    CHAIN_ID: z.preprocess(
      blankToUndefined,
      z.coerce
        .number({ error: 'harus angka' })
        .int('harus bilangan bulat')
        .refine((value) => value in SUPPORTED_CHAINS, 'hanya 11155111 (Sepolia) atau 31337 (Hardhat lokal)')
        .default(SEPOLIA_CHAIN_ID),
    ),
  })
  .superRefine((value, context) => {
    if (value.KOS_TOKEN_ADDRESS && value.KOS_TOKEN_ADDRESS === value.KOS_LEDGER_ADDRESS) {
      context.addIssue({ code: 'custom', path: ['KOS_LEDGER_ADDRESS'], message: 'tidak boleh sama dengan KOS_TOKEN_ADDRESS' });
    }
    if (value.SEPOLIA_RPC_URL_FALLBACK && value.SEPOLIA_RPC_URL_FALLBACK === value.SEPOLIA_RPC_URL) {
      context.addIssue({
        code: 'custom',
        path: ['SEPOLIA_RPC_URL_FALLBACK'],
        message: 'sama dengan SEPOLIA_RPC_URL; kosongkan atau isi RPC penyedia lain',
      });
    }
  });

/** Memvalidasi variabel worker. Melempar Error berbahasa Indonesia tanpa menampilkan nilai apa pun. */
export function parseBlockchainConfig(source: Record<string, string | undefined>): BlockchainConfig {
  const result = schema.safeParse(source);
  if (!result.success) {
    const detail = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(
      `Konfigurasi worker blockchain tidak valid:\n${detail}\n` +
        'Isi variabel blockchain di backend/.env (lihat backend/.env.example) atau di environment shell.',
    );
  }

  const data = result.data;
  return Object.freeze({
    chainId: data.CHAIN_ID,
    networkName: SUPPORTED_CHAINS[data.CHAIN_ID] ?? 'tidak dikenal',
    rpcUrls: Object.freeze(
      data.SEPOLIA_RPC_URL_FALLBACK ? [data.SEPOLIA_RPC_URL, data.SEPOLIA_RPC_URL_FALLBACK] : [data.SEPOLIA_RPC_URL],
    ),
    operatorPrivateKey: data.OPERATOR_PRIVATE_KEY,
    custodialMnemonic: data.CUSTODIAL_WALLET_MNEMONIC,
    tokenAddress: data.KOS_TOKEN_ADDRESS,
    ledgerAddress: data.KOS_LEDGER_ADDRESS,
  });
}

/** Membaca konfigurasi dari process.env (backend/.env sudah dimuat oleh src/config/env.ts). */
export function loadBlockchainConfig(): BlockchainConfig {
  return parseBlockchainConfig(process.env);
}

/** Nilai rahasia yang tidak boleh muncul di log, pesan error, maupun basis data. */
export function secretValues(config: BlockchainConfig): string[] {
  return [config.operatorPrivateKey, config.custodialMnemonic, ...config.rpcUrls].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );
}

/** Ringkasan aman untuk log: tanpa kunci, tanpa mnemonic, dan RPC hanya nama host. */
export function describeConfig(config: BlockchainConfig) {
  return {
    network: config.networkName,
    chainId: config.chainId,
    rpcHosts: config.rpcUrls.map((url) => new URL(url).host),
    tokenAddress: config.tokenAddress,
    ledgerAddress: config.ledgerAddress,
    custodialCheck: config.custodialMnemonic ? 'mnemonic' : 'tabel dompet saja',
  };
}
