import { describe, expect, it } from 'vitest';
import type { AdminJobStatus } from '../../lib/job-status.js';
import type { ExpenseRecord, RentRecord, RoomRecord } from '../periods/records.js';
import { buildRoomBoard } from './board.js';

const room = (number: string, tenantId: string | null = `t-${number}`): RoomRecord => ({
  id: `room-${number}`,
  number,
  status: tenantId ? 'OCCUPIED' : 'VACANT',
  tenantId,
});

function rent(number: string, chain: AdminJobStatus | 'UNPAID'): RentRecord {
  const unpaid = chain === 'UNPAID';
  return {
    billId: `bill-${number}`,
    room: room(number),
    tenantId: `t-${number}`,
    amountIdr: 1_500_000n,
    status: unpaid ? 'UNPAID' : 'PAID',
    dueDate: new Date('2026-11-10T00:00:00.000Z'),
    paidAt: unpaid ? null : new Date('2026-11-05T03:00:00.000Z'),
    payment: unpaid ? null : { id: 'p', orderId: 'o', paidAt: new Date('2026-11-05T03:00:00.000Z') },
    job: unpaid ? null : { id: 'j', paymentRef: '0x1', state: { status: chain, txHash: null, blockNumber: null, attempts: 1, lastError: null, updatedAt: null, resolved: false } },
  };
}

describe('buildRoomBoard', () => {
  it('jumlah sewa, keterlambatan WIB, dan urutan tindak lanjut', () => {
    const board = buildRoomBoard({
      period: '2026-11',
      rooms: [room('K01'), room('K04'), room('K06', null), room('K08')],
      rents: [rent('K01', 'RECORDED'), rent('K04', 'UNPAID'), rent('K08', 'FAILED')],
      expenses: [{ id: 'exp-k07', job: { id: 'j', state: { status: 'QUEUED' } } } as ExpenseRecord],
      tenantNames: new Map([['t-K01', 'Bagus Nugroho']]),
      // 18 Nov 2026 pukul 06.30 WIB.
      now: new Date('2026-11-17T23:30:00.000Z'),
    });

    expect(board.summary).toEqual({
      expectedIdr: 4_500_000,
      paidIdr: 3_000_000,
      recordedIdr: 1_500_000,
      pendingIdr: 1_500_000,
      roomsPaid: 2,
      roomsRecorded: 1,
      roomsOccupied: 3,
    });
    expect(board.rooms.map((tile) => [tile.roomNumber, tile.tenantName, tile.chain?.status ?? null, tile.daysOverdue])).toEqual([
      ['K01', 'Bagus Nugroho', 'RECORDED', 0],
      ['K04', null, null, 8],
      ['K06', null, null, 0],
      ['K08', null, 'FAILED', 0],
    ]);
    expect(board.followUps).toEqual([
      { kind: 'OVERDUE', roomNumber: 'K04', expenseId: null },
      { kind: 'CHAIN_FAILED', roomNumber: 'K08', expenseId: null },
      { kind: 'EXPENSE_PENDING', roomNumber: null, expenseId: 'exp-k07' },
    ]);
  });

  it('belum lewat jatuh tempo: tidak terlambat', () => {
    const board = buildRoomBoard({
      period: '2026-11',
      rooms: [room('K04')],
      rents: [rent('K04', 'UNPAID')],
      expenses: [],
      tenantNames: new Map(),
      now: new Date('2026-11-10T10:00:00.000Z'),
    });
    expect(board.rooms[0]?.daysOverdue).toBe(0);
    expect(board.followUps).toEqual([]);
  });
});
