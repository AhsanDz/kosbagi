import { requestBackend } from "@/lib/api/client";
import type { ManagerRoomsPayload } from "@/lib/api/types";

/**
 * Kunci SWR sekaligus alamat GET status kamar. Tanpa periode, backend memakai
 * periode berjalan (tagihan terbaru) dan menuliskannya di respons.
 */
export function managerRoomsKey(period: string | null): string {
  return period ? `/manager/rooms?period=${encodeURIComponent(period)}` : "/manager/rooms";
}

export function fetchManagerRooms(key: string): Promise<ManagerRoomsPayload> {
  return requestBackend<ManagerRoomsPayload>(key);
}
