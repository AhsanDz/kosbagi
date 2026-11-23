import type { ManagerRoomDto, ManagerRoomsPayload } from "@/lib/api/types";

/**
 * Keadaan Ubin kamar di papan pengelola:
 * - recorded: lunas dan recordRent tercatat (lime)
 * - waiting: lunas tetapi pencatatannya belum selesai atau gagal
 * - unpaid: kamar terisi yang belum dibayar
 * - vacant: kamar kosong atau dalam perbaikan
 */
export type ManagerTileKind = "recorded" | "waiting" | "unpaid" | "vacant";

export function isOccupied(room: ManagerRoomDto): boolean {
  return room.status === "OCCUPIED";
}

export function tileKind(room: ManagerRoomDto): ManagerTileKind {
  if (!isOccupied(room)) return "vacant";
  if (room.bill?.status !== "PAID") return "unpaid";
  return room.chain?.status === "RECORDED" ? "recorded" : "waiting";
}

/** Kamar yang menunggu pencatatan membuat halaman dipantau ulang. */
export function roomsHavePending(payload: ManagerRoomsPayload): boolean {
  return payload.rooms.some((room) => tileKind(room) === "waiting" && room.chain?.status !== "FAILED");
}

/** Jumlah per keterangan warna di Ringkasan sewa. */
export function legendCounts(payload: ManagerRoomsPayload) {
  const { summary, rooms } = payload;
  return {
    recorded: summary.roomsRecorded,
    waiting: Math.max(summary.roomsPaid - summary.roomsRecorded, 0),
    unpaid: Math.max(summary.roomsOccupied - summary.roomsPaid, 0),
    vacant: rooms.filter((room) => !isOccupied(room)).length,
  };
}

/** Urutan kamar alami: K01, K02, ..., K10. */
export function sortRooms(rooms: ManagerRoomDto[]): ManagerRoomDto[] {
  return [...rooms].sort((a, b) =>
    a.roomNumber.localeCompare(b.roomNumber, "id", { numeric: true })
  );
}
