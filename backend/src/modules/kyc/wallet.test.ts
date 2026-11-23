import { HDNodeWallet } from 'ethers';
import { describe, expect, it } from 'vitest';
import { CUSTODIAL_BASE_PATH, deriveCustodialAddress } from './wallet.js';

// Mnemonic uji publik bawaan Hardhat. Alamat akun #0 dan #1 sudah dikenal luas, jadi bisa dipakai
// sebagai vektor uji path m/44'/60'/0'/0/<indeks>.
const HARDHAT_MNEMONIC = 'test test test test test test test test test test test junk';

describe('deriveCustodialAddress', () => {
  it('sama dengan alamat akun Hardhat untuk path m/44\'/60\'/0\'/0/<indeks>', () => {
    expect(deriveCustodialAddress(HARDHAT_MNEMONIC, 0)).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    expect(deriveCustodialAddress(HARDHAT_MNEMONIC, 1)).toBe('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
  });

  it('sama dengan penurunan path lengkap oleh ethers', () => {
    const expected = HDNodeWallet.fromPhrase(HARDHAT_MNEMONIC, undefined, `${CUSTODIAL_BASE_PATH}/7`).address;
    expect(deriveCustodialAddress(HARDHAT_MNEMONIC, 7)).toBe(expected);
  });

  it('mnemonic berbeda menghasilkan alamat berbeda', () => {
    const other = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    expect(deriveCustodialAddress(other, 0)).not.toBe(deriveCustodialAddress(HARDHAT_MNEMONIC, 0));
  });
});
