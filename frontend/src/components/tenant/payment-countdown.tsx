"use client";

import { useEffect, useState } from "react";

import { formatCountdown } from "@/lib/format";

/** Batas bayar Snap (5 menit), dipakai hanya untuk panjang batang waktu. */
const PAYMENT_WINDOW_MS = 5 * 60 * 1000;

interface PaymentCountdownProps {
  /** Batas waktu dari backend, jadi tetap benar setelah halaman dimuat ulang. */
  expiresAt: string;
  onExpired: () => void;
}

/**
 * Kotak "Sisa waktu" di slip tagihan. Dipisah menjadi komponen sendiri supaya
 * detak tiap detik hanya merender ulang kotak ini, bukan seluruh halaman.
 */
export function PaymentCountdown({ expiresAt, onExpired }: PaymentCountdownProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const remainingMs = Math.max(0, new Date(expiresAt).getTime() - now);
  const expired = remainingMs === 0;

  useEffect(() => {
    if (expired) onExpired();
  }, [expired, onExpired]);

  const label = formatCountdown(remainingMs);

  return (
    <div className="flex flex-col gap-2.5 rounded-lg bg-warning-muted px-4 pt-3.5 pb-4 text-warning-muted-foreground">
      <div className="flex items-center justify-between">
        <p className="text-sm leading-5 font-medium">Sisa waktu</p>
        <p role="timer" className="font-mono text-mono-lg font-medium tabular-nums">
          {label}
        </p>
      </div>
      <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-warning-track">
        <div
          className="h-full origin-left rounded-full bg-warning transition-transform duration-1000 ease-linear"
          style={{ transform: `scaleX(${Math.min(1, remainingMs / PAYMENT_WINDOW_MS)})` }}
        />
      </div>
    </div>
  );
}
