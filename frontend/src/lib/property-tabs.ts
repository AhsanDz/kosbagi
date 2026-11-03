/**
 * Daftar tab detail kos. Nilai tab dipakai di URL, mis. /kos/sumbersari-01?tab=keuangan,
 * jadi setiap tab bisa ditautkan langsung. Berkas ini bukan komponen klien supaya
 * bisa dipakai di Server Component (page) maupun Client Component (tab).
 */
export const propertyTabs = [
  { value: "ringkasan", label: "Ringkasan" },
  { value: "keuangan", label: "Keuangan" },
  { value: "dokumen", label: "Dokumen" },
  { value: "blockchain", label: "Blockchain" },
  { value: "risiko", label: "Risiko" },
] as const;

export type PropertyTab = (typeof propertyTabs)[number]["value"];

export const DEFAULT_PROPERTY_TAB: PropertyTab = "ringkasan";

/** Mengubah nilai ?tab= dari URL menjadi tab yang sah; selain itu kembali ke Ringkasan. */
export function parsePropertyTab(value: string | string[] | undefined): PropertyTab {
  const raw = Array.isArray(value) ? value[0] : value;
  const match = propertyTabs.find((tab) => tab.value === raw);
  return match ? match.value : DEFAULT_PROPERTY_TAB;
}
