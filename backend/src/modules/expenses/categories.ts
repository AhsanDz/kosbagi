// Kategori biaya operasional (P4). Kodenya uint8, sama dengan argumen `category` di
// KosLedger.recordExpense; kontrak hanya menyimpan angkanya, labelnya dipegang backend.
export const EXPENSE_CATEGORIES = [
  { code: 1, label: 'Listrik dan air' },
  { code: 2, label: 'Kebersihan' },
  { code: 3, label: 'Internet' },
  { code: 4, label: 'Perbaikan' },
  { code: 5, label: 'Keamanan' },
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

const LABELS = new Map<number, string>(EXPENSE_CATEGORIES.map((category) => [category.code, category.label]));

export function isExpenseCategory(code: number): boolean {
  return LABELS.has(code);
}

/** Label kategori. Kode yang tidak dikenal (mis. dari data lama) ditampilkan sebagai "Kategori <kode>". */
export function categoryLabel(code: number): string {
  return LABELS.get(code) ?? `Kategori ${code}`;
}
