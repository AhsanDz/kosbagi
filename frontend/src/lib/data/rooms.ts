import type { RoomRent } from "@/lib/types";

/** Periode sewa berjalan (format YYYY-MM). */
export const currentPeriod = "2026-11";

/**
 * Status sewa 10 kamar Kos Sumbersari 01 untuk periode November 2026.
 * 7 kamar lunas dan tercatat lewat recordRent, K04 belum bayar, K07 menunggu
 * pembayaran Midtrans, K06 kosong. Tx hash masih dummy (belum ada di Sepolia).
 */
export const roomRents: RoomRent[] = [
  {
    code: "K01",
    occupied: true,
    billStatus: "PAID",
    amountIdr: 1_500_000,
    chainStatus: "CONFIRMED",
    txHash: "0x1c7e22dc0ec31fd5cdcabfe31b8f92de62db48a39ac2fdab3b1676e2d1229a40",
  },
  {
    code: "K02",
    occupied: true,
    billStatus: "PAID",
    amountIdr: 1_500_000,
    chainStatus: "CONFIRMED",
    txHash: "0x5d026b75e5633d32e262167b27cc8866a825cfb9fdb9b40b657bd6db00f1e7b3",
  },
  {
    code: "K03",
    occupied: true,
    billStatus: "PAID",
    amountIdr: 1_500_000,
    chainStatus: "CONFIRMED",
    txHash: "0x8f3ad09f1f873de4fbf297d449a54dccd88cc804f0a1c7d9084bee45dc49c21d",
  },
  { code: "K04", occupied: true, billStatus: "UNPAID", amountIdr: 1_500_000 },
  {
    code: "K05",
    occupied: true,
    billStatus: "PAID",
    amountIdr: 1_500_000,
    chainStatus: "CONFIRMED",
    txHash: "0xa94f2b721681c5ef0bdc18bb964de323186cd6d0fe7e16bf0eb976b8a10b0c18",
  },
  { code: "K06", occupied: false, billStatus: null, amountIdr: 1_500_000 },
  { code: "K07", occupied: true, billStatus: "PENDING", amountIdr: 1_500_000 },
  {
    code: "K08",
    occupied: true,
    billStatus: "PAID",
    amountIdr: 1_500_000,
    chainStatus: "CONFIRMED",
    txHash: "0x3be6804cab4ae554a5c917f76436bbdf924dfbf56b25590576a1c1e5fb3671fa",
  },
  {
    code: "K09",
    occupied: true,
    billStatus: "PAID",
    amountIdr: 1_500_000,
    chainStatus: "CONFIRMED",
    txHash: "0xe21046747ffec8287ca8e2580c4404250392cce2902998be2ec7f14b415f5d9c",
  },
  {
    code: "K10",
    occupied: true,
    billStatus: "PAID",
    amountIdr: 1_500_000,
    chainStatus: "CONFIRMED",
    txHash: "0x7f8ba33bf1c68e0f45702711873d275b0a7041e9731af49048252de1a6e02a63",
  },
];

/** Ringkasan papan kamar: kamar terisi, sudah bayar, dan total sewa masuk. */
export function summarizeRooms(rooms: RoomRent[]) {
  const occupied = rooms.filter((room) => room.occupied);
  const paid = occupied.filter((room) => room.billStatus === "PAID");
  return {
    occupiedCount: occupied.length,
    paidCount: paid.length,
    collectedAmountIdr: paid.reduce((total, room) => total + room.amountIdr, 0),
  };
}
