import { HDNodeWallet } from 'ethers';
import { describe, expect, it } from 'vitest';
import { createCustodialDeriver, custodialDerivationPath } from './custodial-wallet.js';
import { HARDHAT_MNEMONIC } from './testing/fakes.js';

describe('dompet kustodian HD', () => {
  const deriver = createCustodialDeriver(HARDHAT_MNEMONIC);

  it("path m/44'/60'/0'/0/<indeks> menghasilkan alamat yang sama dengan akun bawaan Hardhat", () => {
    // Akun #0 sampai #3 yang dicetak `npx hardhat node`.
    expect(deriver.addressAt(0)).toBe('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    expect(deriver.addressAt(1)).toBe('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
    expect(deriver.addressAt(3)).toBe('0x90F79bf6EB2c4f870365E785982E1f101E93b906');
  });

  it('sama dengan menurunkan langsung dari path lengkap', () => {
    const direct = HDNodeWallet.fromPhrase(HARDHAT_MNEMONIC, '', custodialDerivationPath(25));
    expect(deriver.addressAt(25)).toBe(direct.address);
    expect(custodialDerivationPath(25)).toBe("m/44'/60'/0'/0/25");
  });

  it('indeks berbeda menghasilkan alamat berbeda', () => {
    const addresses = new Set(Array.from({ length: 20 }, (_value, index) => deriver.addressAt(index)));
    expect(addresses.size).toBe(20);
  });

  it('menolak indeks negatif, pecahan, atau di luar batas non-hardened', () => {
    for (const index of [-1, 1.5, 2 ** 31]) {
      expect(() => deriver.addressAt(index)).toThrow('Indeks dompet kustodian harus bilangan bulat 0 sampai 2^31 - 1.');
    }
  });

  it('objek penurun tidak membocorkan mnemonic bila dicetak', () => {
    expect(JSON.stringify(deriver)).not.toContain('junk');
  });
});
