import { describe, expect, it } from 'vitest';
import { etherscanAddressUrl, etherscanTxUrl } from './etherscan.js';

const HASH = `0x${'8F3A'.repeat(16)}`;

describe('etherscanTxUrl', () => {
  it('membentuk tautan https://sepolia.etherscan.io/tx/<hash>', () => {
    expect(etherscanTxUrl(HASH)).toBe(`https://sepolia.etherscan.io/tx/${HASH.toLowerCase()}`);
    expect(etherscanTxUrl(HASH, 11_155_111)).toBe(`https://sepolia.etherscan.io/tx/${HASH.toLowerCase()}`);
  });

  it('jaringan Hardhat lokal tidak punya penjelajah blok', () => {
    expect(etherscanTxUrl(HASH, 31_337)).toBeNull();
  });

  it('menolak hash yang formatnya salah', () => {
    expect(() => etherscanTxUrl('0x1234')).toThrow('Format tx hash tidak valid.');
  });
});

describe('etherscanAddressUrl', () => {
  it('membentuk tautan alamat', () => {
    const address = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
    expect(etherscanAddressUrl(address)).toBe(`https://sepolia.etherscan.io/address/${address}`);
    expect(etherscanAddressUrl(address, 31_337)).toBeNull();
    expect(() => etherscanAddressUrl('bukan-alamat')).toThrow('Format alamat tidak valid.');
  });
});
