// Tautan penjelajah blok untuk transaksi dan alamat. Hanya Sepolia yang punya Etherscan; jaringan
// Hardhat lokal tidak punya penjelajah publik, jadi tautannya null.
import { SEPOLIA_CHAIN_ID } from './networks.js';

export const SEPOLIA_ETHERSCAN_URL = 'https://sepolia.etherscan.io';

const EXPLORERS: Readonly<Record<number, string>> = { [SEPOLIA_CHAIN_ID]: SEPOLIA_ETHERSCAN_URL };

const TX_HASH = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

/** `https://sepolia.etherscan.io/tx/<hash>`, atau null untuk jaringan tanpa Etherscan. */
export function etherscanTxUrl(txHash: string, chainId: number = SEPOLIA_CHAIN_ID): string | null {
  if (!TX_HASH.test(txHash)) throw new Error('Format tx hash tidak valid.');
  const base = EXPLORERS[chainId];
  return base ? `${base}/tx/${txHash.toLowerCase()}` : null;
}

/** `https://sepolia.etherscan.io/address/<alamat>`, atau null untuk jaringan tanpa Etherscan. */
export function etherscanAddressUrl(address: string, chainId: number = SEPOLIA_CHAIN_ID): string | null {
  if (!ADDRESS.test(address)) throw new Error('Format alamat tidak valid.');
  const base = EXPLORERS[chainId];
  return base ? `${base}/address/${address}` : null;
}
