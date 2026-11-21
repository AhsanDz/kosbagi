import { id, JsonRpcProvider } from 'ethers';
import { describe, expect, it } from 'vitest';
import { KosContracts, kosLedgerInterface, kosTokenInterface } from './contracts.js';

describe('ABI kontrak', () => {
  it('memuat fungsi yang dipanggil dan dibaca worker', () => {
    for (const name of ['recordRent', 'isPaymentRefRecorded', 'isRentRecorded', 'token', 'hasRole', 'OPERATOR_ROLE']) {
      expect(kosLedgerInterface.getFunction(name), name).not.toBeNull();
    }
    for (const name of [
      'setKycStatus',
      'transferFromTreasury',
      'isKycApproved',
      'isPurchaseRefUsed',
      'propertyCode',
      'treasury',
      'originalOwner',
      'maxBalance',
      'KYC_ROLE',
    ]) {
      expect(kosTokenInterface.getFunction(name), name).not.toBeNull();
    }
  });

  it('memuat event yang dicari saat catatan sudah ada', () => {
    expect(kosLedgerInterface.getEvent('RentRecorded')).not.toBeNull();
    expect(kosTokenInterface.getEvent('TreasuryTransfer')).not.toBeNull();
    expect(kosTokenInterface.getEvent('KycStatusUpdated')).not.toBeNull();
  });

  it('argumen recordRent sesuai tipe kontrak: uint16, uint32, uint256, bytes32', () => {
    const fragment = kosLedgerInterface.getFunction('recordRent');
    expect(fragment?.inputs.map((input) => input.type)).toEqual(['uint16', 'uint32', 'uint256', 'bytes32']);
    const ref = id('RENT-SMR01-K03-2026-11');
    const data = kosLedgerInterface.encodeFunctionData('recordRent', [3, 202611, 1_500_000n, ref]);
    expect([...kosLedgerInterface.decodeFunctionData('recordRent', data)]).toEqual([3n, 202611n, 1_500_000n, ref]);
  });
});

describe('KosContracts', () => {
  it('menyimpan alamat dalam bentuk checksum', () => {
    const provider = new JsonRpcProvider('http://127.0.0.1:1', 31_337, { staticNetwork: true });
    const contracts = new KosContracts(
      '0x5fbdb2315678afecb367f032d93f642f64180aa3',
      '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
      provider,
    );
    expect(contracts.tokenAddress).toBe('0x5FbDB2315678afecb367f032d93F642f64180aa3');
    expect(contracts.ledgerAddress).toBe('0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512');
    provider.destroy();
  });

  it('pencarian log yang gagal (mis. RPC membatasi eth_getLogs) menghasilkan null, bukan error', async () => {
    const provider = new JsonRpcProvider('http://127.0.0.1:1', 31_337, { staticNetwork: true });
    const contracts = new KosContracts(
      '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      provider,
    );
    await expect(contracts.findRentRecorded(id('x'))).resolves.toBeNull();
    provider.destroy();
  });
});
