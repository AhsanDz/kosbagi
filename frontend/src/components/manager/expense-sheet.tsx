"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import {
  CaretDownIcon,
  CircleNotchIcon,
  FileTextIcon,
  UploadSimpleIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { fieldErrors, toApiError } from "@/lib/api/client";
import { createExpense } from "@/lib/api/expenses";
import type {
  DuplicateReceiptDetails,
  ExpenseCategoryDto,
  ExpenseDto,
} from "@/lib/api/types";
import {
  amountInputText,
  canHashInBrowser,
  checkReceiptFile,
  DESCRIPTION_MAX,
  digitsOnly,
  RECEIPT_ACCEPT,
  SERVER_FIELD,
  sha256File,
  validateExpenseForm,
  type ExpenseFormErrors,
  type ExpenseFormValues,
} from "@/lib/expenses";
import { formatDate, formatFileSize, formatPeriod, shortenHash } from "@/lib/format";
import { periodEndDate, periodStartDate } from "@/lib/period";
import type { HexString } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMPTY_VALUES: ExpenseFormValues = {
  categoryCode: "",
  amountDigits: "",
  receiptDate: "",
  description: "",
};

type HashState =
  | { status: "idle" }
  | { status: "hashing" }
  | { status: "ready"; hash: HexString }
  | { status: "unavailable" };

interface DuplicateNotice extends DuplicateReceiptDetails {
  hash: HexString | null;
}

/** Rincian 409 RECEIPT_ALREADY_RECORDED, bila bentuknya sesuai kontrak. */
function readDuplicate(details: unknown): DuplicateReceiptDetails | null {
  if (!details || typeof details !== "object") return null;
  const value = details as Partial<DuplicateReceiptDetails>;
  return typeof value.categoryLabel === "string" && typeof value.receiptDate === "string"
    ? (value as DuplicateReceiptDetails)
    : null;
}

interface ExpenseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Periode tujuan biaya, mis. "2026-11", atau periode berikutnya setelah ditutup. */
  period: string;
  categories: ExpenseCategoryDto[];
  onRecorded: (expense: ExpenseDto) => void;
}

/**
 * Sheet catat biaya (Figma: "Sheet catat biaya"), 480 px di kanan. Hash SHA-256
 * nota dihitung di peramban dari isi file dan ditampilkan sebelum disimpan;
 * backend menghitung ulang dan menjadi acuan. Simpan dan catat nonaktif sampai
 * semua isian dan file lengkap. Nota yang sudah pernah dicatat (409) ditolak
 * dengan Alert error di atas form yang menyebut biaya dan tanggal nota pertama.
 */
export function ExpenseSheet({ open, onOpenChange, period, categories, onRecorded }: ExpenseSheetProps) {
  const [values, setValues] = useState<ExpenseFormValues>(EMPTY_VALUES);
  const [touched, setTouched] = useState<Partial<Record<keyof ExpenseFormValues, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<ExpenseFormErrors>({});
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [hashState, setHashState] = useState<HashState>({ status: "idle" });
  const [duplicate, setDuplicate] = useState<DuplicateNotice | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Hanya hasil hash file terakhir yang dipakai bila pengguna mengganti file di tengah jalan.
  const hashTicket = useRef(0);

  const clientErrors = validateExpenseForm(values, period);
  const errorFor = (field: keyof ExpenseFormValues) =>
    serverErrors[field] ?? (touched[field] ? clientErrors[field] : undefined);

  const hashReady = hashState.status === "ready" || hashState.status === "unavailable";
  const canSubmit =
    Object.keys(clientErrors).length === 0 &&
    file !== null &&
    fileError === null &&
    hashReady &&
    duplicate === null &&
    !submitting;

  function reset() {
    setValues(EMPTY_VALUES);
    setTouched({});
    setServerErrors({});
    setFile(null);
    setFileError(null);
    setHashState({ status: "idle" });
    setDuplicate(null);
    setFormError(null);
    setSubmitting(false);
    hashTicket.current += 1;
  }

  function handleOpenChange(next: boolean) {
    if (!next && submitting) return;
    if (!next) reset();
    onOpenChange(next);
  }

  function update<K extends keyof ExpenseFormValues>(field: K, value: ExpenseFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => ({ ...current, [field]: undefined }));
    setFormError(null);
  }

  function markTouched(field: keyof ExpenseFormValues) {
    setTouched((current) => ({ ...current, [field]: true }));
  }

  async function chooseFile(next: File | null) {
    hashTicket.current += 1;
    const ticket = hashTicket.current;
    setDuplicate(null);
    setFormError(null);
    setFile(next);
    if (!next) {
      setFileError(null);
      setHashState({ status: "idle" });
      return;
    }
    const problem = checkReceiptFile(next);
    setFileError(problem);
    if (problem) {
      setHashState({ status: "idle" });
      return;
    }
    if (!canHashInBrowser()) {
      setHashState({ status: "unavailable" });
      return;
    }
    setHashState({ status: "hashing" });
    try {
      const hash = await sha256File(next);
      if (hashTicket.current === ticket) setHashState({ status: "ready", hash });
    } catch {
      if (hashTicket.current === ticket) setHashState({ status: "unavailable" });
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files.item(0);
    if (dropped) void chooseFile(dropped);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ categoryCode: true, amountDigits: true, receiptDate: true, description: true });
    if (!canSubmit || !file) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const { expense } = await createExpense({
        period,
        categoryCode: Number(values.categoryCode),
        description: values.description.trim(),
        amountIdr: Number(values.amountDigits),
        receiptDate: values.receiptDate,
        file,
      });
      reset();
      onRecorded(expense);
    } catch (caught) {
      setSubmitting(false);
      const error = toApiError(caught);
      if (error.code === "RECEIPT_ALREADY_RECORDED") {
        const details = readDuplicate(error.details);
        const hash = hashState.status === "ready" ? hashState.hash : null;
        setDuplicate(
          details
            ? { ...details, hash }
            : {
                expenseId: "",
                categoryLabel: "lain",
                description: "",
                receiptDate: "",
                amountIdr: 0,
                createdAt: "",
                hash,
              }
        );
        return;
      }
      if (error.code === "FILE_TOO_LARGE") {
        setFileError("Ukuran file lebih dari 5 MB. Pilih file yang lebih kecil.");
        return;
      }
      if (error.code === "UNSUPPORTED_FILE_TYPE") {
        setFileError("Format file harus JPG, PNG, atau PDF.");
        return;
      }
      if (error.code === "VALIDATION_ERROR") {
        const mapped: ExpenseFormErrors = {};
        for (const [path, message] of Object.entries(fieldErrors(error))) {
          const field = SERVER_FIELD[path];
          if (field === "file") setFileError(message);
          else if (field) mapped[field] = message;
        }
        setServerErrors(mapped);
        if (Object.keys(mapped).length === 0) setFormError(error.message);
        return;
      }
      if (error.code === "PERIOD_CLOSED") {
        setFormError(`Periode ${formatPeriod(period)} sudah ditutup, jadi biayanya tidak bisa ditambah lagi.`);
        return;
      }
      setFormError(error.message);
    }
  }

  const categoryError = errorFor("categoryCode");
  const amountError = errorFor("amountDigits");
  const dateError = errorFor("receiptDate");
  const descriptionError = errorFor("description");

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 bg-card p-0 text-card-foreground sm:max-w-[480px]"
      >
        <div className="flex items-center justify-between gap-4 pt-6 pr-5 pb-2 pl-7">
          <SheetTitle className="text-h4 font-semibold text-card-foreground">Catat biaya</SheetTitle>
          <SheetClose asChild>
            <Button type="button" variant="ghost" size="icon" disabled={submitting}>
              <XIcon aria-hidden />
              <span className="sr-only">Tutup</span>
            </Button>
          </SheetClose>
        </div>

        <form noValidate onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-7 pt-1 pb-6">
            <SheetDescription className="text-sm leading-5 text-muted-foreground">
              Periode {formatPeriod(period)}. Hash nota dicatat di KosLedger; file nota disimpan di
              KosBagi, tidak di blockchain.
            </SheetDescription>

            {duplicate ? (
              <Alert variant="destructive">
                <WarningCircleIcon aria-hidden />
                <AlertTitle>Nota ini sudah tercatat</AlertTitle>
                <AlertDescription>
                  {duplicate.hash ? (
                    <>
                      Hash <span className="font-mono">{shortenHash(duplicate.hash)}</span> sudah
                      dicatat
                    </>
                  ) : (
                    "Nota ini sudah dicatat"
                  )}{" "}
                  untuk biaya {duplicate.categoryLabel}
                  {duplicate.receiptDate ? ` pada ${formatDate(duplicate.receiptDate)}` : ""}. Pilih
                  file nota lain.
                </AlertDescription>
              </Alert>
            ) : null}

            {formError ? (
              <Alert variant="destructive">
                <WarningCircleIcon aria-hidden />
                <AlertTitle>Biaya belum dicatat</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}

            <FieldGroup className="gap-[18px]">
              <Field data-invalid={categoryError ? true : undefined}>
                <FieldLabel htmlFor="biaya-kategori">Kategori</FieldLabel>
                <div className="relative">
                  <select
                    id="biaya-kategori"
                    value={values.categoryCode}
                    aria-invalid={categoryError ? true : undefined}
                    aria-describedby={categoryError ? "biaya-kategori-galat" : undefined}
                    onChange={(event) => update("categoryCode", event.target.value)}
                    onBlur={() => markTouched("categoryCode")}
                    className={cn(
                      "h-11 w-full appearance-none rounded-md border border-input bg-card py-2 pr-10 pl-3 text-base outline-none focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid aria-invalid:border-destructive md:text-sm",
                      values.categoryCode ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    <option value="" disabled>
                      Pilih kategori
                    </option>
                    {categories.map((category) => (
                      <option key={category.code} value={String(category.code)}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                  <CaretDownIcon
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 right-3 size-[18px] -translate-y-1/2 text-foreground"
                  />
                </div>
                {categoryError ? <FieldError id="biaya-kategori-galat">{categoryError}</FieldError> : null}
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field data-invalid={amountError ? true : undefined}>
                  <FieldLabel htmlFor="biaya-nominal">Nominal</FieldLabel>
                  <Input
                    id="biaya-nominal"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Rp0"
                    value={amountInputText(values.amountDigits)}
                    aria-invalid={amountError ? true : undefined}
                    aria-describedby={amountError ? "biaya-nominal-galat" : undefined}
                    onChange={(event) => update("amountDigits", digitsOnly(event.target.value))}
                    onBlur={() => markTouched("amountDigits")}
                  />
                  {amountError ? <FieldError id="biaya-nominal-galat">{amountError}</FieldError> : null}
                </Field>
                <Field data-invalid={dateError ? true : undefined}>
                  <FieldLabel htmlFor="biaya-tanggal">Tanggal</FieldLabel>
                  <Input
                    id="biaya-tanggal"
                    type="date"
                    min={periodStartDate(period)}
                    max={periodEndDate(period)}
                    value={values.receiptDate}
                    aria-invalid={dateError ? true : undefined}
                    aria-describedby={dateError ? "biaya-tanggal-galat" : undefined}
                    onChange={(event) => update("receiptDate", event.target.value)}
                    onBlur={() => markTouched("receiptDate")}
                  />
                  {dateError ? <FieldError id="biaya-tanggal-galat">{dateError}</FieldError> : null}
                </Field>
              </div>

              <Field data-invalid={descriptionError ? true : undefined}>
                <FieldLabel htmlFor="biaya-keterangan">Keterangan</FieldLabel>
                <Input
                  id="biaya-keterangan"
                  maxLength={DESCRIPTION_MAX}
                  placeholder="Mis. token listrik November"
                  value={values.description}
                  aria-invalid={descriptionError ? true : undefined}
                  aria-describedby={descriptionError ? "biaya-keterangan-galat" : undefined}
                  onChange={(event) => update("description", event.target.value)}
                  onBlur={() => markTouched("description")}
                />
                {descriptionError ? (
                  <FieldError id="biaya-keterangan-galat">{descriptionError}</FieldError>
                ) : null}
              </Field>

              <Field data-invalid={fileError ? true : undefined}>
                <FieldLabel htmlFor="biaya-nota">Nota biaya</FieldLabel>
                <input
                  ref={fileInputRef}
                  id="biaya-nota"
                  type="file"
                  accept={RECEIPT_ACCEPT}
                  tabIndex={-1}
                  className="sr-only"
                  aria-describedby="biaya-nota-bantuan"
                  onChange={(event) => {
                    void chooseFile(event.target.files?.item(0) ?? null);
                    event.target.value = "";
                  }}
                />
                {file && !fileError ? (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-sm">
                      <FileTextIcon aria-hidden className="size-5" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-sm leading-5 font-medium">{file.name}</span>
                      <span className="text-xs leading-4 text-muted-foreground">
                        {formatFileSize(file.size)},{" "}
                        {hashState.status === "hashing" ? "menghitung hash" : "siap diunggah"}
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={submitting}
                      onClick={() => void chooseFile(null)}
                    >
                      <XIcon aria-hidden />
                      <span className="sr-only">Hapus file {file.name}</span>
                    </Button>
                  </div>
                ) : (
                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border border-dashed border-input bg-background p-6 text-center",
                      dragging && "border-foreground",
                      fileError && "border-destructive"
                    )}
                  >
                    <UploadSimpleIcon aria-hidden className="size-6" />
                    <p className="text-sm leading-5 font-medium">Seret foto nota ke sini atau pilih file</p>
                    <p className="text-xs leading-4 text-muted-foreground">JPG, PNG, atau PDF. Maksimal 5 MB.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-describedby="biaya-nota-bantuan"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Pilih file
                    </Button>
                  </div>
                )}
                {fileError ? <FieldError>{fileError}</FieldError> : null}
                {file && !fileError ? (
                  <div className="flex flex-col gap-0.5 text-xs leading-4" aria-live="polite">
                    <span className="font-medium text-muted-foreground">
                      Hash SHA-256 nota (dicatat on-chain)
                    </span>
                    {hashState.status === "ready" ? (
                      <span className="font-mono text-foreground" title={hashState.hash}>
                        {shortenHash(hashState.hash)}
                      </span>
                    ) : hashState.status === "hashing" ? (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <CircleNotchIcon aria-hidden className="size-3 animate-spin" />
                        Menghitung hash dari isi file
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Peramban ini tidak bisa menghitung hash; KosBagi menghitungnya setelah file
                        diunggah.
                      </span>
                    )}
                  </div>
                ) : null}
                <FieldDescription id="biaya-nota-bantuan">
                  Nota tidak dicatat on-chain, hanya hash-nya.
                </FieldDescription>
              </Field>
            </FieldGroup>
          </div>

          <div className="flex gap-3 border-t border-border px-7 pt-4 pb-6">
            <SheetClose asChild>
              <Button type="button" variant="outline" className="flex-1" disabled={submitting}>
                Batal
              </Button>
            </SheetClose>
            <Button type="submit" className="flex-1" disabled={!canSubmit} aria-busy={submitting}>
              {submitting ? (
                <CircleNotchIcon aria-hidden data-icon="inline-start" className="animate-spin" />
              ) : null}
              Simpan dan catat
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
