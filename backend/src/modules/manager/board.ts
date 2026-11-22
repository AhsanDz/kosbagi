// Papan kamar pengelola (P4) tanpa akses basis data, jadi mudah diuji.
import type { BillStatus, RoomStatus } from '../../generated/prisma/client.js';
import { isOpenFailure, managerChainStatus, type ManagerChainStatus } from '../../lib/job-status.js';
import { wibDaysSince } from '../../lib/wib.js';
import type { ExpenseRecord, RentRecord, RoomRecord } from '../periods/records.js';

export interface RoomTileDto {
  roomNumber: string;
  status: RoomStatus;
  /** Nama penghuni. Hanya untuk pengelola dan admin; tidak pernah dicatat on-chain. */
  tenantName: string | null;
  bill: { id: string; status: BillStatus; dueDate: string; paidAt: Date | null; amountIdr: number } | null;
  /** Pencatatan recordRent. Null selama tagihan belum lunas lewat Midtrans. */
  chain: { status: ManagerChainStatus; txHash: string | null } | null;
  /** Hari kalender WIB sejak jatuh tempo untuk tagihan belum dibayar; 0 bila belum lewat. */
  daysOverdue: number;
}

export type FollowUpKind = 'OVERDUE' | 'CHAIN_FAILED' | 'EXPENSE_PENDING';

export interface FollowUpDto {
  kind: FollowUpKind;
  /** Kamar untuk OVERDUE dan CHAIN_FAILED. */
  roomNumber: string | null;
  /** Biaya untuk EXPENSE_PENDING. */
  expenseId: string | null;
}

export interface RoomBoardDto {
  period: string;
  summary: {
    /** Jumlah semua tagihan periode ini. */
    expectedIdr: number;
    paidIdr: number;
    recordedIdr: number;
    /** Lunas tetapi belum tercatat di Sepolia. */
    pendingIdr: number;
    roomsPaid: number;
    roomsRecorded: number;
    roomsOccupied: number;
  };
  rooms: RoomTileDto[];
  followUps: FollowUpDto[];
}

export interface RoomBoardInput {
  period: string;
  rooms: readonly RoomRecord[];
  rents: readonly RentRecord[];
  expenses: readonly ExpenseRecord[];
  tenantNames: ReadonlyMap<string, string>;
  now: Date;
}

function toTile(room: RoomRecord, rent: RentRecord | undefined, input: RoomBoardInput): RoomTileDto {
  const dueDate = rent ? rent.dueDate.toISOString().slice(0, 10) : null;
  const overdue = rent?.status === 'UNPAID' && dueDate ? Math.max(0, wibDaysSince(dueDate, input.now)) : 0;
  return {
    roomNumber: room.number,
    status: room.status,
    tenantName: room.tenantId ? (input.tenantNames.get(room.tenantId) ?? null) : null,
    bill:
      rent && dueDate
        ? { id: rent.billId, status: rent.status, dueDate, paidAt: rent.paidAt, amountIdr: Number(rent.amountIdr) }
        : null,
    chain: rent?.job ? { status: managerChainStatus(rent.job.state.status), txHash: rent.job.state.txHash } : null,
    daysOverdue: overdue,
  };
}

export function buildRoomBoard(input: RoomBoardInput): RoomBoardDto {
  const rentByRoom = new Map(input.rents.map((rent) => [rent.room.id, rent]));
  const tiles = input.rooms.map((room) => toTile(room, rentByRoom.get(room.id), input));

  const paid = input.rents.filter((rent) => rent.status === 'PAID');
  const recorded = paid.filter((rent) => rent.job?.state.status === 'RECORDED');
  const sum = (rows: readonly RentRecord[]) => rows.reduce((total, rent) => total + rent.amountIdr, 0n);
  const paidIdr = sum(paid);
  const recordedIdr = sum(recorded);

  const followUps: FollowUpDto[] = [
    ...tiles
      .filter((tile) => tile.daysOverdue > 0)
      .map((tile): FollowUpDto => ({ kind: 'OVERDUE', roomNumber: tile.roomNumber, expenseId: null })),
    // Job yang sudah ditandai ditangani admin tidak perlu ditindaklanjuti lagi.
    ...input.rents
      .filter((rent) => rent.job !== null && isOpenFailure(rent.job.state))
      .map((rent): FollowUpDto => ({ kind: 'CHAIN_FAILED', roomNumber: rent.room.number, expenseId: null })),
    ...input.expenses
      .filter((expense) => expense.job.state.status !== 'RECORDED' && !expense.job.state.resolved)
      .map((expense): FollowUpDto => ({ kind: 'EXPENSE_PENDING', roomNumber: null, expenseId: expense.id })),
  ];

  return {
    period: input.period,
    summary: {
      expectedIdr: Number(sum(input.rents)),
      paidIdr: Number(paidIdr),
      recordedIdr: Number(recordedIdr),
      pendingIdr: Number(paidIdr - recordedIdr),
      roomsPaid: paid.length,
      roomsRecorded: recorded.length,
      roomsOccupied: input.rooms.filter((room) => room.status === 'OCCUPIED').length,
    },
    rooms: tiles,
    followUps,
  };
}
