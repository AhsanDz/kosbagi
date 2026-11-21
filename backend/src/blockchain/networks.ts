// Jaringan yang boleh dipakai worker. Prototipe hanya testnet, jadi mainnet dan jaringan lain ditolak.
export const SEPOLIA_CHAIN_ID = 11_155_111;
export const HARDHAT_CHAIN_ID = 31_337;

export const SUPPORTED_CHAINS: Readonly<Record<number, string>> = Object.freeze({
  [SEPOLIA_CHAIN_ID]: 'Sepolia',
  [HARDHAT_CHAIN_ID]: 'Hardhat lokal',
});
