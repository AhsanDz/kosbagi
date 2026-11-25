import { UnrecoverableError } from 'bullmq';
import { id, makeError } from 'ethers';
import { stdSerializers } from 'pino';
import { describe, expect, it } from 'vitest';
import { kosLedgerInterface, kosTokenInterface } from './contracts.js';
import {
  decodeRevert,
  extractRevertData,
  isDeterministicError,
  PermanentJobError,
  RedactedCauseError,
  redactSecrets,
  RetryableJobError,
  safeErrorMessage,
  sanitizedErrorCopy,
} from './errors.js';
import { connectionRefused, revertError } from './testing/fakes.js';

const REF = id('RENT-SMR01-K03-2026-11');

describe('decodeRevert', () => {
  it('mengurai custom error KosLedger dari data revert', () => {
    expect(decodeRevert(revertError(kosLedgerInterface, 'PaymentRefAlreadyRecorded', [REF]), kosLedgerInterface)).toEqual({
      name: 'PaymentRefAlreadyRecorded',
      args: [REF],
    });
  });

  it('mengurai error bawaan OpenZeppelin yang ikut di ABI', () => {
    const decoded = decodeRevert(revertError(kosTokenInterface, 'EnforcedPause'), kosTokenInterface);
    expect(decoded?.name).toBe('EnforcedPause');
  });

  it('menemukan data revert di dalam error JSON-RPC bersarang', () => {
    const data = kosLedgerInterface.encodeErrorResult('InvalidRoom', []);
    const nested = { error: { info: { error: { code: 3, message: 'execution reverted', data } } } };
    expect(extractRevertData(nested)).toBe(data);
    expect(decodeRevert(nested, kosLedgerInterface)?.name).toBe('InvalidRoom');
  });

  it('null untuk error yang bukan revert atau selector yang tidak dikenal', () => {
    expect(decodeRevert(connectionRefused(), kosLedgerInterface)).toBeNull();
    expect(decodeRevert({ data: '0xdeadbeef' }, kosLedgerInterface)).toBeNull();
  });
});

describe('isDeterministicError', () => {
  it('revert dan kegagalan permanen tidak diulang cepat; gangguan jaringan diulang', () => {
    expect(isDeterministicError(revertError(kosLedgerInterface, 'InvalidRoom'))).toBe(true);
    expect(isDeterministicError(new PermanentJobError('x'))).toBe(true);
    expect(isDeterministicError(makeError('kurang', 'INSUFFICIENT_FUNDS', { transaction: {} }))).toBe(true);
    expect(isDeterministicError(connectionRefused())).toBe(false);
    expect(isDeterministicError(makeError('timeout', 'TIMEOUT', { operation: 'x', reason: 'timeout' }))).toBe(false);
    expect(isDeterministicError(new RetryableJobError('x'))).toBe(false);
  });

  it('PermanentJobError dikenali BullMQ sebagai UnrecoverableError', () => {
    expect(new PermanentJobError('x')).toBeInstanceOf(UnrecoverableError);
  });
});

describe('safeErrorMessage', () => {
  it('memakai shortMessage ethers, bukan isi permintaan JSON-RPC', () => {
    const error = revertError(kosLedgerInterface, 'InvalidRoom');
    expect(error.message.length).toBeGreaterThan(error.shortMessage.length);
    expect(safeErrorMessage(error)).toBe('execution reverted (unknown custom error) (CALL_EXCEPTION)');
  });

  it('menyamarkan nilai rahasia dan semua URL', () => {
    const key = `0x${'ab'.repeat(32)}`;
    const message = safeErrorMessage(
      new Error(`gagal kirim dengan ${key} ke https://eth-sepolia.g.alchemy.com/v2/kunci-api status 401`),
      [key],
    );
    expect(message).toBe('gagal kirim dengan [disamarkan] ke [url disamarkan] status 401');
  });

  it('memotong pesan panjang dan merapikan spasi', () => {
    const message = safeErrorMessage(new Error(`baris\n${'x'.repeat(500)}`));
    expect(message.length).toBe(300);
    expect(message.startsWith('baris x')).toBe(true);
    expect(message.endsWith('...')).toBe(true);
  });

  it('nilai bukan Error tetap diubah menjadi teks', () => {
    expect(safeErrorMessage('putus')).toBe('putus');
  });
});

describe('RedactedCauseError', () => {
  const RPC_URL = 'https://eth-sepolia.g.alchemy.com/v2/kunci-api-rahasia';
  // Bentuk error ethers saat RPC menolak permintaan: pesan lengkapnya memuat URL RPC beserta API key.
  const rpcError = () =>
    makeError('server response 401 Unauthorized', 'SERVER_ERROR', { request: RPC_URL, info: { requestUrl: RPC_URL } });

  it('menyimpan salinan tersaring sebagai cause, bukan error aslinya', () => {
    const original = rpcError();
    expect(original.message).toContain('kunci-api-rahasia');

    const wrapped = new RedactedCauseError('Kontrak tidak bisa dibaca.', { cause: original, secrets: [RPC_URL] });
    const cause = wrapped.cause as Error;
    expect(wrapped.name).toBe('RedactedCauseError');
    expect(cause).toBeInstanceOf(Error);
    expect(cause).not.toBe(original);
    expect(cause.name).toBe(original.name);
    expect(cause.message).toBe('server response 401 Unauthorized (SERVER_ERROR)');
    expect(cause.stack).not.toContain('kunci-api-rahasia');
    expect(cause.stack).toMatch(/^Error: server response 401 Unauthorized \(SERVER_ERROR\)\n\s+at /);
  });

  it('serializer error pino tidak mencetak rahasia dari rantai penyebab, berbeda dengan cause mentah', () => {
    const wrapped = new RedactedCauseError('Kontrak tidak bisa dibaca.', { cause: rpcError(), secrets: [RPC_URL] });
    const logged = JSON.stringify(stdSerializers.err(wrapped));
    expect(logged).toContain('server response 401 Unauthorized');
    expect(logged).not.toContain('kunci-api-rahasia');

    // Alasan cause tidak diisi error asli: pino ikut mencetak pesan dan stack cause.
    const raw = new Error('Kontrak tidak bisa dibaca.', { cause: rpcError() });
    expect(JSON.stringify(stdSerializers.err(raw))).toContain('kunci-api-rahasia');
  });

  it('nilai rahasia selain URL http ikut disamarkan, mis. kata sandi di REDIS_URL', () => {
    const redisUrl = 'redis://default:sandi-redis-rahasia@redis.contoh:6379';
    const original = Object.assign(new Error(`gagal terhubung ke ${redisUrl}`), { code: 'ECONNREFUSED' });
    const cause = new RedactedCauseError('Redis tidak bisa dihubungi.', { cause: original, secrets: [redisUrl] })
      .cause as Error;
    expect(cause.message).toBe('gagal terhubung ke [disamarkan] (ECONNREFUSED)');
    expect(cause.stack).not.toContain('sandi-redis-rahasia');
  });

  it('nilai bukan Error menjadi Error berpesan teks tanpa stack palsu', () => {
    const copy = sanitizedErrorCopy('putus');
    expect(copy.message).toBe('putus');
    expect(copy.stack).toBe('Error: putus');
  });
});

describe('redactSecrets', () => {
  it('mengabaikan nilai kosong atau terlalu pendek supaya teks biasa tidak ikut tersamar', () => {
    expect(redactSecrets('nilai 0x ada', [undefined, '', '0x'])).toBe('nilai 0x ada');
  });

  it('kurung tutup dan tanda baca sesudah URL tetap tinggal di kalimat', () => {
    expect(redactSecrets('gagal (https://rpc.contoh/v2/kunci-api). Coba lagi.', [])).toBe(
      'gagal ([url disamarkan]). Coba lagi.',
    );
    expect(redactSecrets('RPC: http://127.0.0.1:8545, cadangan: https://b.contoh/k;', [])).toBe(
      'RPC: [url disamarkan], cadangan: [url disamarkan];',
    );
  });

  it('alamat tanpa awalan http tidak dianggap URL, jadi petunjuk untuk pengguna tetap terbaca', () => {
    expect(redactSecrets('untuk Hardhat lokal 127.0.0.1:8545 dengan awalan http', [])).toBe(
      'untuk Hardhat lokal 127.0.0.1:8545 dengan awalan http',
    );
  });
});
