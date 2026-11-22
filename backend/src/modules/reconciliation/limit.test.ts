import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapWithConcurrency, TimeoutError, withTimeout } from './limit.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('mapWithConcurrency', () => {
  it('menjaga urutan hasil sama dengan urutan masukan', async () => {
    const result = await mapWithConcurrency([30, 10, 20], 2, async (delay, index) => {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return `${index}:${delay}`;
    });
    expect(result).toEqual(['0:30', '1:10', '2:20']);
  });

  it('tidak pernah menjalankan lebih dari batas konkurensi', async () => {
    let running = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 12 }, (_, index) => index), 3, async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
    });
    expect(peak).toBe(3);
  });

  it('daftar kosong langsung selesai', async () => {
    expect(await mapWithConcurrency([], 4, async () => 1)).toEqual([]);
  });

  it('menolak batas konkurensi di bawah 1', async () => {
    await expect(mapWithConcurrency([1], 0, async () => 1)).rejects.toThrow(RangeError);
  });
});

describe('withTimeout', () => {
  it('meneruskan hasil yang datang sebelum batas waktu', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1_000, 'lewat')).resolves.toBe('ok');
  });

  it('menolak dengan TimeoutError bila janji tidak selesai tepat waktu', async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise(() => {}), 4_000, 'API tidak menjawab.');
    vi.advanceTimersByTime(4_000);
    await expect(pending).rejects.toEqual(new TimeoutError('API tidak menjawab.'));
  });

  it('langsung menolak bila sisa waktunya habis', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 0, 'habis')).rejects.toBeInstanceOf(TimeoutError);
  });
});
