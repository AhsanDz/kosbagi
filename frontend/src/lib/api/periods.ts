import { requestBackend } from "@/lib/api/client";
import type { DistributePayload, PeriodPayload } from "@/lib/api/types";

/** Kunci SWR sekaligus alamat GET satu periode (struk, syarat, penutupan, distribusi). */
export function periodKey(period: string): string {
  return `/periods/${encodeURIComponent(period)}`;
}

export function fetchPeriod(key: string): Promise<PeriodPayload> {
  return requestBackend<PeriodPayload>(key);
}

/** POST /periods/:period/close: 202, outbox CLOSE_PERIOD. Ditolak 409 bila syarat belum terpenuhi. */
export function closePeriod(period: string): Promise<unknown> {
  return requestBackend<unknown>(`${periodKey(period)}/close`, { method: "POST" });
}

/** POST /periods/:period/distribute: menambahkan bagian tiap pemegang ke saldo, sekali per periode. */
export function distributePeriod(period: string): Promise<DistributePayload> {
  return requestBackend<DistributePayload>(`${periodKey(period)}/distribute`, { method: "POST" });
}
