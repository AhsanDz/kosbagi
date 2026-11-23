import { describe, expect, it } from 'vitest';
import { paymentReference } from '../../queue/jobs.js';
import {
  type BillWithDetail,
  type BillWithPayments,
  leaseEndPeriod,
  toBillDetailDto,
  toBillDto,
  toTenantRoomDto,
} from './dto.js';

const now = new Date('2026-11-05T03:02:00.000Z');
const later = new Date('2026-11-05T03:05:00.000Z');
const earlier = new Date('2026-11-05T03:00:00.000Z');

type PaymentRow = BillWithPayments['payments'][number];

function payment(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: 'pay-1',
    orderId: 'RENT-SMR01-K03-2026-11',
    billId: 'bill-1',
    tokenPurchaseId: null,
    attempt: 1,
    amountIdr: 1_500_000n,
    status: 'PENDING',
    method: null,
    bank: null,
    snapToken: 'snap-token',
    snapRedirectUrl: 'https://snap.test',
    providerStatus: null,
    providerTransactionId: null,
    expiresAt: later,
    paidAt: null,
    createdAt: earlier,
    updatedAt: earlier,
    outboxJob: null,
    ...overrides,
  };
}

function bill(overrides: Partial<BillWithPayments> = {}): BillWithPayments {
  return {
    id: 'bill-1',
    roomId: 'room-1',
    tenantId: 'tenant-1',
    period: '2026-11',
    amountIdr: 1_500_000n,
    status: 'UNPAID',
    dueDate: new Date('2026-11-10T00:00:00.000Z'),
    paidAt: null,
    createdAt: earlier,
    updatedAt: earlier,
    payments: [],
    ...overrides,
  };
}

describe('toBillDto', () => {
  it('tagihan tanpa percobaan: NONE, tanpa payment dan chain', () => {
    expect(toBillDto(bill(), now)).toEqual({
      id: 'bill-1',
      period: '2026-11',
      amountIdr: 1_500_000,
      status: 'UNPAID',
      dueDate: '2026-11-10',
      paidAt: null,
      paymentState: 'NONE',
      payment: null,
      chain: null,
    });
  });

  it('percobaan aktif: PENDING dan membawa token Snap', () => {
    const dto = toBillDto(bill({ payments: [payment()] }), now);

    expect(dto.paymentState).toBe('PENDING');
    expect(dto.payment).toMatchObject({ status: 'PENDING', snapToken: 'snap-token', amountIdr: 1_500_000 });
  });

  it('melewati expiresAt: EXPIRED walau notifikasi belum tiba, dan token tidak dikirim', () => {
    const dto = toBillDto(bill({ payments: [payment({ expiresAt: earlier })] }), now);

    expect(dto.paymentState).toBe('EXPIRED');
    expect(dto.payment).toMatchObject({ status: 'EXPIRED', snapToken: null });
  });

  it('tepat di expiresAt sudah dianggap kedaluwarsa', () => {
    expect(toBillDto(bill({ payments: [payment({ expiresAt: now })] }), now).paymentState).toBe('EXPIRED');
  });

  it('EXPIRED dari Midtrans tetap EXPIRED', () => {
    expect(toBillDto(bill({ payments: [payment({ status: 'EXPIRED' })] }), now).paymentState).toBe('EXPIRED');
  });

  it('FAILED menjadi FAILED dan token tidak dikirim', () => {
    const dto = toBillDto(bill({ payments: [payment({ status: 'FAILED' })] }), now);

    expect(dto.paymentState).toBe('FAILED');
    expect(dto.payment?.snapToken).toBeNull();
  });

  it('memakai percobaan terakhir untuk paymentState', () => {
    const payments = [payment({ id: 'pay-2', attempt: 2 }), payment({ id: 'pay-1', status: 'FAILED' })];

    expect(toBillDto(bill({ payments }), now)).toMatchObject({ paymentState: 'PENDING', payment: { id: 'pay-2' } });
  });

  it('tagihan lunas: PAID dengan chain PENDING selama worker belum mencatat', () => {
    const paidAt = new Date('2026-11-05T03:01:00.000Z');
    const dto = toBillDto(
      bill({ status: 'PAID', paidAt, payments: [payment({ status: 'PAID', paidAt, method: 'bank_transfer' })] }),
      now,
    );

    expect(dto).toMatchObject({
      status: 'PAID',
      paidAt,
      paymentState: 'PAID',
      payment: { status: 'PAID', method: 'bank_transfer', snapToken: null },
      chain: { status: 'PENDING', txHash: null, blockNumber: null },
    });
  });

  it('tagihan lunas dari seed tanpa percobaan: NOT_RECORDED, tanpa payment dan tanpa tautan', () => {
    expect(toBillDto(bill({ status: 'PAID', paidAt: earlier }), now)).toMatchObject({
      paymentState: 'PAID',
      payment: null,
      chain: { status: 'NOT_RECORDED', txHash: null, blockNumber: null },
    });
  });

  it('dua percobaan terbayar: menampilkan yang melunasi, dan DUPLICATE_PAID terbaca PAID', () => {
    const settling = payment({ id: 'pay-1', status: 'PAID' });
    const duplicate = payment({ id: 'pay-2', attempt: 2, status: 'DUPLICATE_PAID' });

    const dto = toBillDto(bill({ status: 'PAID', paidAt: earlier, payments: [duplicate, settling] }), now);
    expect(dto.payment?.id).toBe('pay-1');

    const onlyDuplicate = toBillDto(bill({ status: 'PAID', paidAt: earlier, payments: [duplicate] }), now);
    expect(onlyDuplicate.payment?.status).toBe('PAID');
  });

  it('membaca tx hash dan nomor blok dari transaksi chain terakhir', () => {
    const outboxJob = {
      chainTransactions: [{ status: 'RECORDED', txHash: '0xabc', blockNumber: 123n }],
    } as unknown as PaymentRow['outboxJob'];
    const dto = toBillDto(
      bill({ status: 'PAID', paidAt: earlier, payments: [payment({ status: 'PAID', outboxJob })] }),
      now,
    );

    expect(dto.chain).toEqual({ status: 'RECORDED', txHash: '0xabc', blockNumber: 123 });
  });
});

describe('toBillDetailDto: kuitansi', () => {
  const LEDGER = '0x2b9c000000000000000000000000000000007e10';
  const orderId = 'RENT-SMR01-K03-2026-11';
  const paidAt = new Date('2026-11-09T03:42:00.000Z');

  function detail(overrides: Partial<BillWithDetail> = {}): BillWithDetail {
    return {
      ...bill(),
      tenant: { name: 'Sari Wulandari' },
      room: {
        id: 'room-1',
        propertyId: 'prop-1',
        number: 'K03',
        monthlyRentIdr: 1_500_000n,
        status: 'OCCUPIED',
        tenantId: 'tenant-1',
        createdAt: earlier,
        updatedAt: earlier,
        property: { code: 'SMR01', name: 'Kos Sumbersari 01' },
      },
      ...overrides,
    } as BillWithDetail;
  }

  function paidPayment(chain?: { status: string; txHash: string | null; blockNumber: bigint | null }) {
    const outboxJob = {
      payload: { propertyCode: 'SMR01', roomNumber: 'K03', period: '2026-11', amountIdr: 1_500_000, paymentRef: paymentReference(orderId) },
      chainTransactions: chain ? [chain] : [],
    } as unknown as PaymentRow['outboxJob'];
    return payment({
      status: 'PAID',
      paidAt,
      method: 'bank_transfer',
      bank: 'bca',
      providerTransactionId: '7c1d0e5a-b2f4',
      outboxJob,
    });
  }

  it('belum lunas: receipt null', () => {
    expect(toBillDetailDto(detail(), now, LEDGER).receipt).toBeNull();
  });

  it('lunas dan tercatat: argumen recordRent persis ditambah hasil transaksi', () => {
    const dto = toBillDetailDto(
      detail({
        status: 'PAID',
        paidAt,
        payments: [paidPayment({ status: 'RECORDED', txHash: '0xabc', blockNumber: 7_148_220n })],
      }),
      now,
      LEDGER,
    );

    expect(dto.receipt).toEqual({
      orderId,
      transactionId: '7c1d0e5a-b2f4',
      method: 'bank_transfer',
      bank: 'bca',
      paidAt,
      tenantName: 'Sari Wulandari',
      propertyCode: 'SMR01',
      propertyName: 'Kos Sumbersari 01',
      roomNumber: 'K03',
      onChain: {
        room: 3,
        period: 202611,
        amountIdr: 1_500_000,
        paymentRef: paymentReference(orderId),
        contractAddress: LEDGER,
        txHash: '0xabc',
        blockNumber: 7_148_220,
      },
    });
    expect(dto.chain).toEqual({ status: 'RECORDED', txHash: '0xabc', blockNumber: 7_148_220 });
  });

  it('lunas, menunggu pencatatan: argumen sudah ada, hash masih null', () => {
    const dto = toBillDetailDto(detail({ status: 'PAID', paidAt, payments: [paidPayment()] }), now, null);

    expect(dto.receipt?.onChain).toMatchObject({ room: 3, period: 202611, contractAddress: null, txHash: null, blockNumber: null });
    expect(dto.chain?.status).toBe('PENDING');
  });

  it('data lampau seed: kuitansi tanpa order dan tanpa catatan on-chain', () => {
    const dto = toBillDetailDto(detail({ status: 'PAID', paidAt: earlier }), now, LEDGER);

    expect(dto.chain?.status).toBe('NOT_RECORDED');
    expect(dto.receipt).toMatchObject({ orderId: null, method: null, paidAt: earlier, onChain: null, roomNumber: 'K03' });
  });
});

describe('leaseEndPeriod', () => {
  it('masa sewa 12 bulan', () => {
    expect(leaseEndPeriod('2026-08')).toBe('2027-07');
    expect(leaseEndPeriod('2026-01')).toBe('2026-12');
    expect(leaseEndPeriod('2026-12')).toBe('2027-11');
  });
});

describe('toTenantRoomDto', () => {
  const room = {
    number: 'K03',
    monthlyRentIdr: 1_500_000n,
    property: { name: 'Kos Sumbersari 01', code: 'SMR01', address: 'Jl. Sumbersari, Malang (dummy)', manager: { name: 'Hadi Santoso' } },
  } as Parameters<typeof toTenantRoomDto>[0];

  it('menurunkan masa sewa dan tanggal jatuh tempo dari tagihan', () => {
    expect(toTenantRoomDto(room, '2026-08', new Date('2026-11-10T00:00:00.000Z'))).toEqual({
      number: 'K03',
      propertyName: 'Kos Sumbersari 01',
      propertyCode: 'SMR01',
      propertyAddress: 'Jl. Sumbersari, Malang (dummy)',
      managerName: 'Hadi Santoso',
      monthlyRentIdr: 1_500_000,
      leaseStart: '2026-08',
      leaseEnd: '2027-07',
      dueDay: 10,
    });
  });

  it('kamar tanpa tagihan: masa sewa null', () => {
    expect(toTenantRoomDto(room, null, null)).toMatchObject({ leaseStart: null, leaseEnd: null, dueDay: null });
  });
});

describe('toTenantRoomDto: pengelola', () => {
  it('properti tanpa pengelola: managerName null', () => {
    const room = {
      number: 'K03',
      monthlyRentIdr: 1_500_000n,
      property: { name: 'Kos Sumbersari 01', code: 'SMR01', address: 'Alamat', manager: null },
    } as Parameters<typeof toTenantRoomDto>[0];

    expect(toTenantRoomDto(room, null, null).managerName).toBeNull();
  });
});
