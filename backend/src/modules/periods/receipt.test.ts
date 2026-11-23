import { describe, expect, it } from 'vitest';
import type { AdminJobStatus, JobState } from '../../lib/job-status.js';
import { closedReceipt, computeRequirements, periodStatus, provisionalReceipt } from './receipt.js';
import type { ExpenseRecord, RentRecord, TransferRecord } from './records.js';

const state = (status: AdminJobStatus): JobState => ({ status, txHash: null, blockNumber: null, attempts: 1, lastError: null, updatedAt: null, resolved: false });

function rent(number: string, chain: AdminJobStatus | 'UNPAID' | 'NO_PAYMENT'): RentRecord {
  const unpaid = chain === 'UNPAID';
  const noPayment = chain === 'NO_PAYMENT';
  return {
    billId: `bill-${number}`,
    room: { id: `room-${number}`, number, status: 'OCCUPIED', tenantId: `t-${number}` },
    tenantId: `t-${number}`,
    amountIdr: 1_500_000n,
    status: unpaid ? 'UNPAID' : 'PAID',
    dueDate: new Date('2026-11-10'),
    paidAt: unpaid ? null : new Date('2026-11-05'),
    payment: unpaid || noPayment ? null : { id: `pay-${number}`, orderId: `RENT-SMR01-${number}-2026-11`, paidAt: new Date('2026-11-05') },
    job: unpaid || noPayment ? null : { id: `job-${number}`, paymentRef: '0x1', state: state(chain) },
  };
}

function expense(amountIdr: bigint, chain: AdminJobStatus): ExpenseRecord {
  return { amountIdr, job: { id: 'job', state: state(chain) } } as ExpenseRecord;
}

function transfer(chain: AdminJobStatus | null, withPayment = true): TransferRecord {
  return {
    purchaseId: 'p',
    investorId: 'i',
    orderNumber: 'BUY-SMR01-0001',
    tokenAmount: 100,
    amountIdr: 10_000_000n,
    createdAt: new Date(),
    payment: withPayment ? { id: 'pay', orderId: 'BUY-SMR01-0001', paidAt: new Date() } : null,
    job: chain ? { id: 'job', state: state(chain) } : null,
  };
}

const PREPARED = [expense(1_150_000n, 'RECORDED'), expense(600_000n, 'RECORDED'), expense(450_000n, 'RECORDED'), expense(200_000n, 'RECORDED')];

describe('periodStatus', () => {
  it('urutan OPEN, CLOSING, CLOSE_FAILED, CLOSED, DISTRIBUTED', () => {
    expect(periodStatus(null, false)).toBe('OPEN');
    expect(periodStatus('QUEUED', false)).toBe('CLOSING');
    expect(periodStatus('PENDING', false)).toBe('CLOSING');
    expect(periodStatus('FAILED', false)).toBe('CLOSE_FAILED');
    expect(periodStatus('RECORDED', false)).toBe('CLOSED');
    expect(periodStatus('RECORDED', true)).toBe('DISTRIBUTED');
  });
});

describe('computeRequirements', () => {
  it('menghitung sewa, nota, dan transfer yang belum tercatat, serta job gagal', () => {
    const requirements = computeRequirements({
      rents: [rent('K01', 'RECORDED'), rent('K04', 'UNPAID'), rent('K08', 'FAILED'), rent('K09', 'QUEUED')],
      expenses: [...PREPARED, expense(300_000n, 'PENDING')],
      transfers: [transfer('RECORDED'), transfer('PENDING'), transfer(null)],
      closeJob: null,
    });
    expect(requirements).toEqual([
      { key: 'RENT_UNRECORDED', ok: false, count: 2 },
      { key: 'EXPENSE_UNRECORDED', ok: false, count: 1 },
      { key: 'TRANSFER_UNRECORDED', ok: false, count: 2 },
      { key: 'JOB_FAILED', ok: false, count: 1 },
    ]);
  });

  it('tagihan belum dibayar, data lampau tanpa pembayaran Midtrans, dan pesanan tanpa pembayaran tidak menghalangi', () => {
    const requirements = computeRequirements({
      rents: [rent('K04', 'UNPAID'), rent('K03', 'NO_PAYMENT')],
      expenses: [],
      transfers: [transfer(null, false)],
      closeJob: null,
    });
    expect(requirements.every((requirement) => requirement.ok)).toBe(true);
  });

  it('JOB_FAILED hanya menghitung job periode itu dan transfer token; CLOSE_PERIOD yang gagal ikut', () => {
    const requirements = computeRequirements({
      rents: [rent('K01', 'RECORDED')],
      expenses: [expense(300_000n, 'FAILED')],
      transfers: [transfer('FAILED')],
      closeJob: { id: 'close', state: state('FAILED') },
    });
    expect(requirements.find((requirement) => requirement.key === 'JOB_FAILED')).toEqual({ key: 'JOB_FAILED', ok: false, count: 3 });
  });

  it('job gagal yang sudah ditandai ditangani tidak menghalangi syarat mana pun', () => {
    const handled = (status: AdminJobStatus): JobState => ({ ...state(status), resolved: true });
    const k08 = rent('K08', 'FAILED');
    const requirements = computeRequirements({
      rents: [rent('K01', 'RECORDED'), { ...k08, job: { ...k08.job!, state: handled('FAILED') } }],
      expenses: [{ amountIdr: 300_000n, job: { id: 'e', state: handled('FAILED') } } as ExpenseRecord],
      transfers: [{ ...transfer('FAILED'), job: { id: 't', state: handled('FAILED') } }],
      closeJob: null,
    });
    expect(requirements.every((requirement) => requirement.ok)).toBe(true);
  });
});

describe('provisionalReceipt', () => {
  it('frame "belum siap": Rp12.000.000 dan Rp2.400.000 menjadi Rp390 per token', () => {
    const rents = [...['K01', 'K02', 'K03', 'K04', 'K05', 'K07', 'K09', 'K10'].map((room) => rent(room, 'RECORDED')), rent('K08', 'FAILED')];
    expect(provisionalReceipt(rents, [...PREPARED, expense(300_000n, 'PENDING')], 18_000)).toEqual({
      provisional: true,
      grossRentIdr: 12_000_000,
      roomsRecorded: 8,
      roomsTotal: 9,
      expensesIdr: 2_400_000,
      expensesRecorded: 4,
      platformFeeIdr: 600_000,
      taxableProfitIdr: 9_000_000,
      taxIdr: 1_980_000,
      netRentIdr: 7_020_000,
      totalSupply: 18_000,
      valuePerTokenSen: 39_000,
    });
  });

  it('semua tercatat: angka November 43875 sen', () => {
    const rents = ['K01', 'K02', 'K03', 'K04', 'K05', 'K07', 'K08', 'K09', 'K10'].map((room) => rent(room, 'RECORDED'));
    expect(provisionalReceipt(rents, [...PREPARED, expense(300_000n, 'RECORDED')], 18_000)).toMatchObject({
      grossRentIdr: 13_500_000,
      expensesIdr: 2_700_000,
      platformFeeIdr: 675_000,
      taxableProfitIdr: 10_125_000,
      taxIdr: 2_227_500,
      netRentIdr: 7_897_500,
      valuePerTokenSen: 43_875,
    });
  });

  it('belum ada yang tercatat: nol, bukan error', () => {
    expect(provisionalReceipt([rent('K01', 'UNPAID')], [], 18_000)).toMatchObject({ grossRentIdr: 0, netRentIdr: 0, valuePerTokenSen: 0, roomsTotal: 1 });
  });
});

describe('closedReceipt', () => {
  it('angka dari kontrak; laba kena pajak = sewa bersih + pajak', () => {
    const receipt = closedReceipt(
      {
        grossRentIdr: 13_500_000n,
        totalExpensesIdr: 2_700_000n,
        platformFeeIdr: 675_000n,
        taxIdr: 2_227_500n,
        netRentIdr: 7_897_500n,
        totalSupply: 18_000,
        valuePerTokenSen: 43_875n,
        snapshotBlock: 7_312_884n,
      },
      [rent('K01', 'RECORDED')],
      [expense(300_000n, 'RECORDED')],
    );
    expect(receipt).toMatchObject({ provisional: false, taxableProfitIdr: 10_125_000, valuePerTokenSen: 43_875, roomsRecorded: 1, expensesRecorded: 1 });
  });
});
