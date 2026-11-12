// Menguji pembungkus Midtrans tanpa jaringan, dengan adapter axios tiruan. midtrans-client memuat
// axios lewat require dari node_modules, jadi vi.mock tidak menjangkaunya. Adapter dipasang langsung
// di axios yang sama, sehingga kode midtrans-client sendiri (pemetaan error) tetap ikut teruji.
// Baris ini harus berjalan sebelum panggilan pertama, karena klien menyalin defaults saat dibuat.
import { createRequire } from 'node:module';
import type { AxiosAdapter, AxiosStatic } from 'axios';
import midtransClient from 'midtrans-client';
import { beforeEach, describe, expect, it } from 'vitest';
import { midtrans, MidtransUnavailableError, PAYMENT_WINDOW_MINUTES, SNAP_ENABLED_PAYMENTS } from './midtrans.js';

const requests: { url: string; data: string; auth: { username: string } }[] = [];
const respond: { current: () => { status: number; data: unknown } } = { current: () => ({ status: 200, data: {} }) };

const requireFromMidtrans = createRequire(createRequire(import.meta.url).resolve('midtrans-client'));
const axios = requireFromMidtrans('axios') as { default: AxiosStatic };

const fakeAdapter: AxiosAdapter = async (config) => {
  requests.push({ url: config.url ?? '', data: config.data, auth: config.auth as never });
  const { status, data } = respond.current();
  const response = { status, statusText: '', data, headers: {}, config };
  if (status >= 400) throw new axios.default.AxiosError('gagal', 'ERR_BAD_RESPONSE', config, undefined, response);
  return response;
};
axios.default.defaults.adapter = fakeAdapter;

beforeEach(() => {
  requests.length = 0;
});

const snapInput = {
  orderId: 'RENT-SMR01-K03-2026-11',
  amountIdr: 1_500_000n,
  itemName: 'Sewa K03 2026-11',
  customer: { name: 'Sari Wulandari', email: 'penghuni.dummy@kosbagi.test' },
  startsAt: new Date('2026-11-05T03:00:00.000Z'),
};

describe('createSnapTransaction', () => {
  it('mengirim permintaan sandbox dengan nominal bilangan bulat dan batas 5 menit', async () => {
    respond.current = () => ({ status: 201, data: { token: 'tok-1', redirect_url: 'https://snap.test/tok-1' } });

    await expect(midtrans.createSnapTransaction(snapInput)).resolves.toEqual({
      token: 'tok-1',
      redirectUrl: 'https://snap.test/tok-1',
    });

    const [request] = requests;
    expect(request?.url).toBe('https://app.sandbox.midtrans.com/snap/v1/transactions');
    expect(request?.auth.username).toMatch(/^SB-Mid-server-/);

    const body = JSON.parse(request?.data ?? '{}');
    expect(body.transaction_details).toEqual({ order_id: 'RENT-SMR01-K03-2026-11', gross_amount: 1_500_000 });
    expect(body.enabled_payments).toEqual([...SNAP_ENABLED_PAYMENTS]);
    expect(body.expiry).toEqual({
      start_time: '2026-11-05 10:00:00 +0700',
      unit: 'minutes',
      duration: PAYMENT_WINDOW_MINUTES,
    });
    expect(body.page_expiry).toEqual({ duration: 5, unit: 'minutes' });
    expect(body.item_details).toEqual([
      { id: 'RENT-SMR01-K03-2026-11', name: 'Sewa K03 2026-11', price: 1_500_000, quantity: 1 },
    ]);
  });

  it('mengubah kegagalan Midtrans menjadi MidtransUnavailableError', async () => {
    respond.current = () => ({ status: 401, data: { error_messages: ['Access denied'] } });

    await expect(midtrans.createSnapTransaction(snapInput)).rejects.toBeInstanceOf(MidtransUnavailableError);
  });
});

describe('getTransactionStatus', () => {
  const settlement = {
    status_code: '200',
    transaction_status: 'settlement',
    gross_amount: '1500000.00',
    payment_type: 'bank_transfer',
    fraud_status: 'accept',
    transaction_id: 'trx-1',
    signature_key: 'tidak-dipakai',
  };

  it('memanggil API status sandbox dan hanya mengambil field yang dipakai', async () => {
    respond.current = () => ({ status: 200, data: settlement });

    const status = await midtrans.getTransactionStatus('RENT-SMR01-K03-2026-11');

    expect(requests[0]?.url).toBe('https://api.sandbox.midtrans.com/v2/RENT-SMR01-K03-2026-11/status');
    expect(status).toEqual({
      status_code: '200',
      transaction_status: 'settlement',
      gross_amount: '1500000.00',
      payment_type: 'bank_transfer',
      fraud_status: 'accept',
      transaction_id: 'trx-1',
    });
  });

  it('membaca status_code 404 di body HTTP 200 sebagai transaksi tidak ada', async () => {
    respond.current = () => ({ status: 200, data: { status_code: '404', status_message: "Transaction doesn't exist." } });

    await expect(midtrans.getTransactionStatus('RENT-X')).resolves.toBeNull();
  });

  it('membaca HTTP 404 sebagai transaksi tidak ada', async () => {
    respond.current = () => ({ status: 404, data: { status_code: '404' } });

    await expect(midtrans.getTransactionStatus('RENT-X')).resolves.toBeNull();
  });

  it('menerima status_code 407 milik transaksi kedaluwarsa', async () => {
    respond.current = () => ({
      status: 200,
      data: { status_code: '407', transaction_status: 'expire', gross_amount: '1500000.00' },
    });

    await expect(midtrans.getTransactionStatus('RENT-X')).resolves.toMatchObject({ transaction_status: 'expire' });
  });

  it('melempar MidtransUnavailableError saat Midtrans bermasalah atau jawabannya aneh', async () => {
    respond.current = () => ({ status: 500, data: {} });
    await expect(midtrans.getTransactionStatus('RENT-X')).rejects.toBeInstanceOf(MidtransUnavailableError);

    respond.current = () => ({ status: 200, data: { status_code: '200' } });
    await expect(midtrans.getTransactionStatus('RENT-X')).rejects.toBeInstanceOf(MidtransUnavailableError);
  });
});

describe('midtrans-client', () => {
  it('mengekspor kelas yang dibungkus modul ini', () => {
    expect(midtransClient.Snap).toBeTypeOf('function');
    expect(midtransClient.MidtransError).toBeTypeOf('function');
  });
});
