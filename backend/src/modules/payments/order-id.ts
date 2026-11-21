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

/** Nomor pesanan token: BUY-SMR01-0003. Berurutan per properti, empat digit. */
export function buildPurchaseOrderNumber(propertyCode: string, sequence: number): string {
  return `BUY-${propertyCode}-${String(sequence).padStart(4, '0')}`;
}

/** order_id percobaan bayar pesanan token: nomor pesanan, lalu -2, -3 untuk percobaan ulang. */
export function buildPurchaseOrderId(orderNumber: string, attempt: number): string {
  return attempt === 1 ? orderNumber : `${orderNumber}-${attempt}`;
}
