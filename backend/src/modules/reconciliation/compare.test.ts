import { describe, expect, it } from 'vitest';
import { SEPOLIA_CHAIN_ID } from '../../blockchain/networks.js';
import {
  compareSources,
  formatRupiah,
  isMidtransPaid,
  midtransErrorFact,
  parseGrossAmount,
  toMidtransFact,
} from './compare.js';
import {
  buyFact,
  notRecorded,
  recorded,
  RENT_IDR,
  rentFact,
  settlement,
  TOKEN_PRICE_IDR,
  TX_HASH,
  unpaid,
  WALLET,
} from './testing.js';
import { type AnomalyFact, DATABASE_NOT_FOUND, MIDTRANS_ERROR, MIDTRANS_NOT_FOUND } from './types.js';

const HARDHAT = { chainId: 31_337 };

function anomaly(type: string, overrides: Partial<AnomalyFact> = {}): AnomalyFact {
  return {
    type,
    note: null,
    expectedAmountIdr: RENT_IDR,
    receivedAmountIdr: RENT_IDR,
    occurrences: 1,
    createdAt: new Date('2026-11-12T03:00:00.000Z'),
    ...overrides,
  };
}
const SEPOLIA = { chainId: SEPOLIA_CHAIN_ID };

describe('pembacaan jawaban Midtrans', () => {
  it('mengubah gross_amount menjadi rupiah bulat dan menolak pecahan', () => {
    expect(parseGrossAmount('1500000.00')).toBe(1_500_000n);
    expect(parseGrossAmount('1500000')).toBe(1_500_000n);
    expect(parseGrossAmount('1500000.50')).toBeNull();
    expect(parseGrossAmount('abc')).toBeNull();
    expect(parseGrossAmount(undefined)).toBeNull();
  });

  it('lunas hanya untuk settlement atau capture dengan status_code 200 dan fraud accept', () => {
    expect(isMidtransPaid({ transaction_status: 'settlement', status_code: '200' })).toBe(true);
    expect(isMidtransPaid({ transaction_status: 'capture', status_code: '200', fraud_status: 'accept' })).toBe(true);
    expect(isMidtransPaid({ transaction_status: 'capture', status_code: '200', fraud_status: 'challenge' })).toBe(false);
    expect(isMidtransPaid({ transaction_status: 'settlement', status_code: '201' })).toBe(false);
    expect(isMidtransPaid({ transaction_status: 'pending', status_code: '201' })).toBe(false);
    expect(isMidtransPaid({ transaction_status: 'refund', status_code: '200' })).toBe(false);
  });

  it('menulis status apa adanya, not_found untuk 404', () => {
    expect(toMidtransFact(null)).toEqual({ status: MIDTRANS_NOT_FOUND, grossAmountIdr: null, paid: false, error: null });
    expect(toMidtransFact({ status_code: '407', transaction_status: 'expire', gross_amount: '1500000.00' })).toEqual({
      status: 'expire',
      grossAmountIdr: 1_500_000n,
      paid: false,
      error: null,
    });
  });

  it('memformat rupiah dengan titik ribuan', () => {
    expect(formatRupiah(1_500_000n)).toBe('Rp1.500.000');
    expect(formatRupiah(20_000_000n)).toBe('Rp20.000.000');
  });
});

describe('baris Cocok', () => {
  it('sewa lunas, settlement, dan tercatat dengan nominal sama', () => {
    const row = compareSources(rentFact(), settlement(), recorded(), SEPOLIA);

    expect(row).toMatchObject({
      orderId: 'RENT-SMR01-K03-2026-11',
      kind: 'RENT',
      amountIdr: RENT_IDR,
      midtrans: { status: 'settlement', grossAmountIdr: RENT_IDR },
      database: { status: 'PAID', amountIdr: RENT_IDR },
      chain: { status: 'RECORDED', amountIdr: RENT_IDR, txHash: TX_HASH, blockNumber: 42, jobStatus: 'RECORDED' },
      result: 'MATCH',
      reasons: [],
      flagged: [],
      subject: { roomNumber: 'K03', period: '2026-11', tokenAmount: null },
    });
    expect(row.chain.explorerUrl).toBe(`https://sepolia.etherscan.io/tx/${TX_HASH}`);
  });

  it('jaringan Hardhat lokal tidak punya tautan Etherscan', () => {
    expect(compareSources(rentFact(), settlement(), recorded(), HARDHAT).chain.explorerUrl).toBeNull();
  });

  it('pembelian token lunas dan token sampai di dompet kustodian investor', () => {
    const row = compareSources(
      buyFact(),
      settlement(10_000_000n),
      recorded(10_000_000n, { tokenAmount: 100n, recipient: WALLET.toUpperCase().replace('0X', '0x') }),
      HARDHAT,
    );
    expect(row.result).toBe('MATCH');
    expect(row.subject.tokenAmount).toBe(100);
  });

  it.each([
    ['kedaluwarsa', 'EXPIRED', 'expire'],
    ['dibatalkan', 'FAILED', 'cancel'],
    ['ditolak', 'FAILED', 'deny'],
  ])('percobaan %s: ketiga sumber sepakat tidak ada uang dan tidak ada catatan', (_label, dbStatus, midtransStatus) => {
    const row = compareSources(rentFact({ status: dbStatus, job: null }), unpaid(midtransStatus), notRecorded, HARDHAT);

    expect(row.result).toBe('MATCH');
    expect(row.chain).toMatchObject({ status: 'NONE', amountIdr: null, txHash: null, jobStatus: null });
  });

  it('percobaan yang belum dibayar atau belum memilih metode', () => {
    const pending = rentFact({ status: 'PENDING', job: null });
    expect(compareSources(pending, unpaid('pending'), notRecorded, HARDHAT).result).toBe('MATCH');
    expect(compareSources(pending, unpaid(MIDTRANS_NOT_FOUND, null), notRecorded, HARDHAT).result).toBe('MATCH');
  });

  it('pembayaran ganda yang dananya sudah dikembalikan (refund) tidak lagi menahan uang', () => {
    const row = compareSources(
      rentFact({ status: 'DUPLICATE_PAID', job: null, orderId: 'RENT-SMR01-K03-2026-11-2' }),
      unpaid('refund'),
      notRecorded,
      HARDHAT,
    );
    expect(row.result).toBe('MATCH');
  });
});

describe('baris Selisih karena pencatatan Sepolia', () => {
  it('K08 lunas tetapi recordRent gagal: status Menunggu dengan job FAILED dan galat worker', () => {
    const row = compareSources(
      rentFact({
        orderId: 'RENT-SMR01-K08-2026-11',
        job: { status: 'FAILED', txHash: null, blockNumber: null, lastError: 'RPC tidak menjawab' },
      }),
      settlement(),
      notRecorded,
      HARDHAT,
    );

    expect(row.result).toBe('MISMATCH');
    expect(row.flagged).toEqual(['CHAIN']);
    expect(row.chain).toMatchObject({ status: 'PENDING', jobStatus: 'FAILED', lastError: 'RPC tidak menjawab', txHash: null });
    expect(row.reasons).toEqual([
      'Sudah lunas, tetapi recordRent gagal dicatat: RPC tidak menjawab. Coba lagi dari antrean job di Ringkasan admin.',
    ]);
  });

  it('lunas dan job masih menunggu worker', () => {
    const row = compareSources(
      rentFact({ job: { status: 'PENDING', txHash: null, blockNumber: null, lastError: null } }),
      settlement(),
      notRecorded,
      HARDHAT,
    );
    expect(row.result).toBe('MISMATCH');
    expect(row.chain.status).toBe('PENDING');
    expect(row.reasons[0]).toMatch(/masih menunggu dikirim worker/);
  });

  it('lunas tanpa job pencatatan sama sekali', () => {
    const row = compareSources(rentFact({ job: null }), settlement(), notRecorded, HARDHAT);
    expect(row.chain.status).toBe('NONE');
    expect(row.reasons[0]).toMatch(/job recordRent tidak ada/);
  });

  it('database mencatat tx hash, tetapi kontrak yang dipakai tidak punya catatannya', () => {
    const row = compareSources(rentFact(), settlement(), notRecorded, HARDHAT);
    expect(row.chain.status).toBe('NONE');
    expect(row.reasons[0]).toMatch(/tidak ada di kontrak yang sedang dipakai/);
  });

  it('nominal di Sepolia berbeda dari tagihan', () => {
    const row = compareSources(rentFact(), settlement(), recorded(1_400_000n), HARDHAT);
    expect(row.flagged).toEqual(['CHAIN']);
    expect(row.reasons).toEqual(['Nominal di Sepolia Rp1.400.000 berbeda dari nominal di database Rp1.500.000.']);
  });

  it('tercatat tetapi nominal log tidak terbaca', () => {
    const row = compareSources(rentFact(), settlement(), recorded(RENT_IDR, { amountIdr: null }), HARDHAT);
    expect(row.result).toBe('MISMATCH');
    expect(row.reasons[0]).toMatch(/tidak bisa dibaca dari log/);
  });

  it('tercatat padahal database tidak mencatat order itu lunas', () => {
    const row = compareSources(rentFact({ status: 'EXPIRED' }), unpaid('expire'), recorded(), HARDHAT);
    expect(row.flagged).toEqual(['CHAIN']);
    expect(row.reasons).toEqual(['Tercatat di Sepolia padahal database tidak mencatat order ini lunas.']);
  });

  it('token dikirim ke alamat selain dompet kustodian investor', () => {
    const other = '0x2222222222222222222222222222222222222222';
    const row = compareSources(buyFact(), settlement(10_000_000n), recorded(10_000_000n, { recipient: other }), HARDHAT);
    expect(row.result).toBe('MISMATCH');
    expect(row.reasons[0]).toMatch(/bukan ke dompet kustodian investor/);
  });

  it('kontrak tidak bisa dibaca', () => {
    const row = compareSources(
      rentFact(),
      settlement(),
      { ...notRecorded, status: 'ERROR', error: 'RPC tidak bisa dihubungi' },
      HARDHAT,
    );
    expect(row.chain).toMatchObject({ status: 'ERROR', lastError: 'RPC tidak bisa dihubungi' });
    expect(row.flagged).toEqual(['CHAIN']);
  });
});

describe('baris Selisih karena anomali (keputusan 20 November 2026)', () => {
  it('skenario 7: notifikasi bernominal palsu, padahal ketiga sumber sepakat', () => {
    const row = compareSources(
      rentFact({
        anomalies: [
          anomaly('AMOUNT_MISMATCH', {
            note: 'Notifikasi 15000.00, API status 1500000.00.',
            receivedAmountIdr: 15_000n,
          }),
        ],
      }),
      settlement(),
      recorded(),
      HARDHAT,
    );

    expect(row.result).toBe('MISMATCH');
    expect(row.flagged).toEqual([]);
    expect(row.reasons).toEqual(['Ada anomali AMOUNT_MISMATCH.']);
    expect(row.anomalies).toEqual([
      expect.objectContaining({ type: 'AMOUNT_MISMATCH', note: 'Notifikasi 15000.00, API status 1500000.00.' }),
    ]);
  });

  it('percobaan kedaluwarsa yang punya anomali tetap Selisih', () => {
    const row = compareSources(
      rentFact({ status: 'EXPIRED', job: null, anomalies: [anomaly('AMOUNT_MISMATCH')] }),
      unpaid('expire'),
      notRecorded,
      HARDHAT,
    );
    expect(row.result).toBe('MISMATCH');
    expect(row.reasons).toEqual(['Ada anomali AMOUNT_MISMATCH.']);
  });

  it('pembayaran ganda: alasan uang ditambah alasan anomali', () => {
    const row = compareSources(
      rentFact({
        orderId: 'RENT-SMR01-K03-2026-11-2',
        status: 'DUPLICATE_PAID',
        job: null,
        anomalies: [anomaly('DUPLICATE_BILL_PAYMENT')],
      }),
      settlement(),
      notRecorded,
      HARDHAT,
    );
    expect(row.reasons).toHaveLength(2);
    expect(row.reasons[1]).toBe('Ada anomali DUPLICATE_BILL_PAYMENT.');
  });

  it('pembayaran ganda yang sudah di-refund tetap Selisih selama anomalinya tercatat', () => {
    const row = compareSources(
      rentFact({ status: 'DUPLICATE_PAID', job: null, anomalies: [anomaly('DUPLICATE_BILL_PAYMENT')] }),
      unpaid('refund'),
      notRecorded,
      HARDHAT,
    );
    expect(row.result).toBe('MISMATCH');
    expect(row.reasons).toEqual(['Ada anomali DUPLICATE_BILL_PAYMENT.']);
  });

  it('beberapa anomali sejenis hanya ditulis sekali, beberapa jenis ditulis masing-masing', () => {
    const row = compareSources(
      rentFact({ anomalies: [anomaly('AMOUNT_MISMATCH'), anomaly('AMOUNT_MISMATCH'), anomaly('UNKNOWN_ORDER')] }),
      settlement(),
      recorded(),
      HARDHAT,
    );
    expect(row.reasons).toEqual(['Ada anomali AMOUNT_MISMATCH.', 'Ada anomali UNKNOWN_ORDER.']);
  });
});

describe('baris Selisih karena uang', () => {
  it('BUY-SMR01-0004: nominal Midtrans Rp20.000.000, pesanan Rp10.000.000, anomali AMOUNT_MISMATCH', () => {
    const row = compareSources(
      buyFact({
        orderId: 'BUY-SMR01-0004',
        status: 'PENDING',
        job: null,
        anomalies: [
          {
            type: 'AMOUNT_MISMATCH',
            note: 'Notifikasi 20000000.00, API status 20000000.00.',
            expectedAmountIdr: 10_000_000n,
            receivedAmountIdr: 20_000_000n,
            occurrences: 1,
            createdAt: new Date('2026-11-12T03:00:00.000Z'),
          },
        ],
      }),
      settlement(20_000_000n),
      notRecorded,
      HARDHAT,
    );

    expect(row.result).toBe('MISMATCH');
    expect(row.flagged).toEqual(['MIDTRANS']);
    expect(row.amountIdr).toBe(10_000_000n);
    expect(row.midtrans.grossAmountIdr).toBe(20_000_000n);
    expect(row.reasons).toEqual([
      'Nominal dari Midtrans tidak sama dengan pesanan, jadi pesanan tidak diproses dan anomali AMOUNT_MISMATCH dicatat. Tidak ada token yang dikirim.',
    ]);
    expect(row.anomalies).toHaveLength(1);
  });

  it('nominal berbeda tanpa anomali', () => {
    const row = compareSources(rentFact(), settlement(1_000_000n), recorded(), HARDHAT);
    expect(row.flagged).toEqual(['MIDTRANS']);
    expect(row.reasons).toEqual(['Nominal di Midtrans Rp1.000.000 berbeda dari nominal di database Rp1.500.000.']);
  });

  it('tagihan sudah lunas lewat order lain: dana percobaan kedua perlu dikembalikan', () => {
    const row = compareSources(
      rentFact({ orderId: 'RENT-SMR01-K03-2026-11-2', status: 'DUPLICATE_PAID', job: null }),
      settlement(),
      notRecorded,
      HARDHAT,
    );
    expect(row.flagged).toEqual(['DATABASE']);
    expect(row.reasons[0]).toMatch(/^Tagihan sudah lunas lewat order lain/);
  });

  it('pesanan terbayar setelah token habis (UNFULFILLED)', () => {
    const row = compareSources(buyFact({ status: 'UNFULFILLED', job: null }), settlement(10_000_000n), notRecorded, HARDHAT);
    expect(row.reasons[0]).toMatch(/tokennya tidak bisa dikirim/);
  });

  it('Midtrans lunas tetapi database masih belum dibayar (notifikasi belum masuk)', () => {
    const row = compareSources(rentFact({ status: 'PENDING', job: null }), settlement(), notRecorded, HARDHAT);
    expect(row.flagged).toEqual(['DATABASE']);
    expect(row.reasons[0]).toMatch(/database belum/);
  });

  it('pembayaran setelah periode ditutup (status dan anomali skema v4, dibaca sebagai teks)', () => {
    const row = compareSources(
      rentFact({ status: 'PAID_AFTER_CLOSE', job: null, anomalies: [anomaly('PAID_AFTER_PERIOD_CLOSED')] }),
      settlement(),
      notRecorded,
      HARDHAT,
    );

    expect(row.result).toBe('MISMATCH');
    expect(row.flagged).toEqual(['DATABASE']);
    expect(row.reasons).toEqual([
      'Pembayaran masuk setelah periode ditutup, jadi tidak ikut dibagikan. Dana perlu dikembalikan.',
      'Ada anomali PAID_AFTER_PERIOD_CLOSED.',
    ]);
  });

  it('status yang belum dikenal tetap terbaca sebagai Selisih bila Midtrans lunas', () => {
    const row = compareSources(rentFact({ status: 'STATUS_BARU', job: null }), settlement(), notRecorded, HARDHAT);
    expect(row.reasons).toEqual(['Midtrans mencatat lunas, tetapi status database STATUS_BARU, bukan PAID.']);
  });

  it('order_id tidak dikenal database: nominal diambil dari Midtrans', () => {
    const row = compareSources(
      rentFact({ status: DATABASE_NOT_FOUND, amountIdr: null, job: null }),
      settlement(),
      notRecorded,
      HARDHAT,
    );
    expect(row.amountIdr).toBe(RENT_IDR);
    expect(row.database).toEqual({ status: DATABASE_NOT_FOUND, amountIdr: null });
    expect(row.reasons[0]).toMatch(/tidak dikenal database/);
  });

  it.each(['expire', 'refund', MIDTRANS_NOT_FOUND])('database lunas tetapi status Midtrans %s', (status) => {
    const row = compareSources(rentFact(), unpaid(status), recorded(), HARDHAT);
    expect(row.flagged).toEqual(['MIDTRANS']);
    expect(row.reasons).toEqual([`Database mencatat lunas, tetapi status Midtrans ${status}.`]);
  });

  it('status Midtrans gagal dicek', () => {
    const row = compareSources(rentFact(), midtransErrorFact('API status Midtrans tidak menjawab dalam batas waktu.'), recorded(), HARDHAT);
    expect(row.midtrans.status).toBe(MIDTRANS_ERROR);
    expect(row.flagged).toEqual(['MIDTRANS']);
    expect(row.reasons[0]).toMatch(/gagal dicek: API status Midtrans tidak menjawab/);
  });

  it('nominal pembelian on-chain dihitung dari jumlah token × harga token', () => {
    const row = compareSources(buyFact(), settlement(10_000_000n), recorded(99n * TOKEN_PRICE_IDR), HARDHAT);
    expect(row.reasons).toEqual(['Nominal di Sepolia Rp9.900.000 berbeda dari nominal di database Rp10.000.000.']);
  });
});
