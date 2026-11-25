import { id, JsonRpcProvider } from 'ethers';
import { describe, expect, it } from 'vitest';
import { KosContracts, kosLedgerInterface, kosTokenInterface, LOG_LOOKBACK_BLOCKS } from './contracts.js';

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

  it('memuat fungsi biaya dan tutup periode (P4)', () => {
    for (const name of ['recordExpense', 'closePeriod', 'isReceiptRecorded', 'periods', 'shareOf']) {
      expect(kosLedgerInterface.getFunction(name), name).not.toBeNull();
    }
    expect(kosLedgerInterface.getFunction('recordExpense')?.inputs.map((input) => input.type)).toEqual([
      'uint32',
      'uint8',
      'uint256',
      'bytes32',
    ]);
    expect(kosLedgerInterface.getFunction('periods')?.outputs.map((output) => output.name)).toEqual([
      'grossRent',
      'totalExpenses',
      'platformFee',
      'tax',
      'netRent',
      'totalSupply',
      'valuePerTokenSen',
      'snapshotBlock',
      'closed',
    ]);
  });

  it('memuat event yang dicari saat catatan sudah ada', () => {
    expect(kosLedgerInterface.getEvent('ExpenseRecorded')).not.toBeNull();
    expect(kosLedgerInterface.getEvent('PeriodClosed')).not.toBeNull();
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
    await expect(contracts.findExpenseRecorded(id('x'))).resolves.toBeNull();
    await expect(contracts.findPeriodClosed(202_611)).resolves.toBeNull();
    provider.destroy();
  });
  it('mencari log paling jauh 10.000 blok ke belakang, sesuai batas rentang eth_getLogs Infura', async () => {
    const LATEST = 12_203_069;
    const ranges: Array<{ fromBlock: string; toBlock: string }> = [];
    // Provider tiruan: mencatat rentang eth_getLogs tanpa jaringan.
    class RecordingProvider extends JsonRpcProvider {
      override async send(method: string, params: Array<unknown> | Record<string, unknown>): Promise<unknown> {
        if (method === 'eth_blockNumber') return `0x${LATEST.toString(16)}`;
        if (method === 'eth_getLogs') {
          ranges.push((params as Array<{ fromBlock: string; toBlock: string }>)[0]!);
          return [];
        }
        throw new Error(`Metode tidak diharapkan: ${method}`);
      }
    }
    const provider = new RecordingProvider('http://127.0.0.1:1', 11_155_111, { staticNetwork: true });
    const contracts = new KosContracts(
      '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      provider,
    );
    await expect(contracts.findRentRecorded(id('x'))).resolves.toBeNull();
    expect(LOG_LOOKBACK_BLOCKS).toBe(10_000);
    expect(ranges).toHaveLength(1);
    expect(Number(ranges[0]!.toBlock)).toBe(LATEST);
    expect(Number(ranges[0]!.toBlock) - Number(ranges[0]!.fromBlock)).toBe(10_000);
    provider.destroy();
  });
});
