import { describe, expect, it } from 'vitest';
import type { AdminJobStatus } from '../../lib/job-status.js';
import type { RentRecord, RoomRecord, TransferRecord } from '../periods/records.js';
import { toCurrentPeriodDto, toHoldingDto, toTransactions } from './dto.js';

const room = (number: string): RoomRecord => ({ id: `room-${number}`, number, status: number === 'K06' ? 'VACANT' : 'OCCUPIED', tenantId: null });

function rent(number: string, chain: AdminJobStatus | 'UNPAID', paidAt = '2026-11-05T03:00:00.000Z'): RentRecord {
  const unpaid = chain === 'UNPAID';
  return {
    billId: `bill-${number}`,
    room: room(number),
    tenantId: 't',
    amountIdr: 1_500_000n,
    status: unpaid ? 'UNPAID' : 'PAID',
    dueDate: new Date('2026-11-10T00:00:00.000Z'),
    paidAt: unpaid ? null : new Date(paidAt),
    payment: unpaid ? null : { id: 'p', orderId: `RENT-SMR01-${number}-2026-11`, paidAt: new Date(paidAt) },
    job: unpaid
      ? null
      : { id: 'j', paymentRef: `0x${number}`, state: { status: chain, txHash: chain === 'RECORDED' ? `0xtx${number}` : null, blockNumber: null, attempts: 1, lastError: null, updatedAt: null, resolved: false } },
  };
}

describe('toHoldingDto', () => {
  it('porsi dua desimal dari total suplai; tanpa token berarti null', () => {
    expect(toHoldingDto('KB-SMR01', 100, 18_000, '0xabc')).toEqual({ tokenSymbol: 'KB-SMR01', tokenBalance: 100, percentOfSupply: 0.56, walletAddress: '0xabc' });
    expect(toHoldingDto('KB-SMR01', 1_800, 18_000, null)?.percentOfSupply).toBe(10);
    expect(toHoldingDto('KB-SMR01', 0, 18_000, '0xabc')).toBeNull();
  });
});

describe('toCurrentPeriodDto', () => {
  it('grafik per tanggal bayar WIB, daftar sewa per kamar tanpa status gagal', () => {
    const rooms = ['K01', 'K02', 'K04', 'K06', 'K08'].map(room);
    const rents = [
      rent('K01', 'RECORDED', '2026-11-03T03:00:00.000Z'),
      // 23.30 WIB tanggal 5 masih tanggal 5; 00.30 WIB tanggal 6 sudah tanggal 6.
      rent('K02', 'RECORDED', '2026-11-05T16:30:00.000Z'),
      rent('K04', 'UNPAID'),
      rent('K08', 'FAILED', '2026-11-14T03:00:00.000Z'),
    ];

    const dto = toCurrentPeriodDto('2026-11', 'OPEN', rooms, rents);

    expect(dto).toMatchObject({ recordedRentIdr: 3_000_000, roomsRecorded: 2, roomsTotal: 4 });
    expect(dto.chart).toEqual([
      { date: '2026-11-03', amountIdr: 1_500_000 },
      { date: '2026-11-05', amountIdr: 1_500_000 },
    ]);
    expect(dto.rentFeed.map((row) => [row.roomNumber, row.status, row.txHash])).toEqual([
      ['K01', 'RECORDED', '0xtxK01'],
      ['K02', 'RECORDED', '0xtxK02'],
      ['K04', 'UNPAID', null],
      ['K06', 'VACANT', null],
      ['K08', 'PENDING', null],
    ]);
    expect(dto.rentFeed[2]).toMatchObject({ dueDate: '2026-11-10', amountIdr: 1_500_000 });
    expect(dto.rentFeed[4]).toMatchObject({ recordedAt: new Date('2026-11-14T03:00:00.000Z'), paymentRef: '0xK08' });
  });
});

describe('toTransactions', () => {
  it('pembelian, bagi hasil, dan lolos KYC, terbaru lebih dulu, tanpa status gagal', () => {
    const transfer: TransferRecord = {
      purchaseId: 'p',
      investorId: 'i',
      orderNumber: 'BUY-SMR01-0003',
      tokenAmount: 100,
      amountIdr: 10_000_000n,
      createdAt: new Date('2026-11-09T02:00:00.000Z'),
      payment: { id: 'pay', orderId: 'BUY-SMR01-0003', paidAt: new Date('2026-11-09T03:00:00.000Z') },
      job: { id: 'j', state: { status: 'FAILED', txHash: null, blockNumber: null, attempts: 5, lastError: 'x', updatedAt: null, resolved: false } },
    };

    const rows = toTransactions(
      [transfer],
      [{ period: '2026-11', tokenBalance: 100, shareIdr: 43_875n, valuePerTokenSen: 43_875n, distributedAt: new Date('2026-12-01T02:05:00.000Z'), snapshotBlock: 7_312_884n, closeTxHash: '0x5e21' }],
      {
        approvedAt: new Date('2026-11-03T03:00:00.000Z'),
        walletAddress: '0x7c4E2a9b6F03d1e8A55c90B4f2D6e1a8C3b719B2',
        whitelist: { status: 'FAILED', txHash: null },
      },
    );

    expect(rows).toEqual([
      {
        type: 'DISTRIBUTION',
        occurredAt: new Date('2026-12-01T02:05:00.000Z'),
        description: 'Distribusi November 2026, 100 token × Rp438,75',
        tokenAmount: 100,
        amountIdr: 43_875,
        chain: { status: 'RECORDED', txHash: '0x5e21' },
      },
      {
        type: 'PURCHASE',
        occurredAt: new Date('2026-11-09T03:00:00.000Z'),
        description: 'BUY-SMR01-0003, 100 token ke dompet kustodian',
        tokenAmount: 100,
        amountIdr: 10_000_000,
        chain: { status: 'PENDING', txHash: null },
      },
      {
        type: 'KYC_APPROVED',
        occurredAt: new Date('2026-11-03T03:00:00.000Z'),
        description: 'Dompet 0x7c4E…19B2 dicatat lolos KYC di KosToken',
        tokenAmount: 0,
        amountIdr: 0,
        chain: { status: 'PENDING', txHash: null },
      },
    ]);
  });
});
