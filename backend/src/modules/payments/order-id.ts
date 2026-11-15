interface RentOrderParts {
  propertyCode: string;
  roomNumber: string;
  period: string;
  /** Nomor percobaan, mulai dari 1. */
  attempt: number;
}

/**
 * order_id unik per percobaan bayar: RENT-SMR01-K03-2026-11, lalu -2, -3 untuk percobaan ulang.
 * Midtrans menolak order_id yang sama dipakai dua kali, jadi percobaan baru butuh order_id baru.
 */
export function buildRentOrderId({ propertyCode, roomNumber, period, attempt }: RentOrderParts): string {
  const base = `RENT-${propertyCode}-${roomNumber}-${period}`;
  return attempt === 1 ? base : `${base}-${attempt}`;
}
