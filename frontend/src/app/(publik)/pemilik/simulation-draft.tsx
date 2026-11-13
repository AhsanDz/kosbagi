"use client";

import { createContext, use, useMemo, useState, type ReactNode } from "react";

import type { ApplicationValues } from "./application";

/** Isian simulasi yang ikut terbawa ke form saat menekan "Ajukan kos ini". */
export type SimulationDraft = Pick<
  ApplicationValues,
  "roomCount" | "monthlyRentIdr" | "occupancyPercent"
>;

interface SimulationDraftState {
  draft: SimulationDraft | null;
  setDraft: (draft: SimulationDraft) => void;
}

const SimulationDraftContext = createContext<SimulationDraftState | null>(null);

/** Menghubungkan simulator dan form, yang letaknya dipisah bagian syarat dan FAQ. */
export function SimulationDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<SimulationDraft | null>(null);
  const state = useMemo(() => ({ draft, setDraft }), [draft]);

  return <SimulationDraftContext value={state}>{children}</SimulationDraftContext>;
}

export function useSimulationDraft(): SimulationDraftState {
  const state = use(SimulationDraftContext);
  if (!state) throw new Error("useSimulationDraft harus dipakai di dalam SimulationDraftProvider.");
  return state;
}
