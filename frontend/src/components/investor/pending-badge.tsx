"use client";

import { useEffect, useState } from "react";

import { BillStatusBadge } from "@/components/common/bill-status-badge";
import { formatCountdown } from "@/lib/format";

/**
 * Badge "Menunggu pembayaran 04:12" di kepala Tiket beli. Detaknya terpisah dari
 * kotak Sisa waktu supaya hanya badge ini yang dirender ulang tiap detik.
 */
export function PendingBadge({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remainingMs = Math.max(0, new Date(expiresAt).getTime() - now);
  return <BillStatusBadge status="PENDING" timeLeft={formatCountdown(remainingMs)} />;
}
