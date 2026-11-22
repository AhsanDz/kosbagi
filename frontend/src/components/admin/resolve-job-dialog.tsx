"use client";

import { useState, type FormEvent } from "react";
import { CircleNotchIcon } from "@phosphor-icons/react/ssr";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

/** Batas catatan sama dengan backend: 5 sampai 300 karakter. */
const NOTE_MIN = 5;
const NOTE_MAX = 300;

function validateNote(note: string): string | null {
  const trimmed = note.trim();
  if (!trimmed) return "Catatan wajib diisi supaya admin lain tahu kenapa job ini tidak diulang.";
  if (trimmed.length < NOTE_MIN) return `Catatan minimal ${NOTE_MIN} karakter.`;
  return null;
}

interface ResolveJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nama job untuk judul, mis. "Catat sewa RENT-SMR01-K08-2026-11". */
  jobName: string;
  submitting: boolean;
  /** Mengirim catatan ke backend. Mengembalikan pesan galat bila backend menolak isiannya. */
  onSubmit: (note: string) => Promise<string | null>;
}

/**
 * Dialog konfirmasi "Tandai ditangani" untuk job on-chain yang gagal permanen.
 * Tidak ada frame Figma khusus; bentuknya mengikuti Dialog tolak KYC (judul,
 * keterangan, satu isian wajib, Batal dan tombol aksi). Catatannya tersimpan
 * bersama nama admin dan tampil di tab Semua.
 */
export function ResolveJobDialog({
  open,
  onOpenChange,
  jobName,
  submitting,
  onSubmit,
}: ResolveJobDialogProps) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (submitting) return;
    if (!next) {
      setNote("");
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateNote(note);
    setError(found);
    if (found) {
      document.getElementById("catatan-penanganan")?.focus();
      return;
    }
    const serverError = await onSubmit(note.trim());
    if (serverError) setError(serverError);
    else {
      setNote("");
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Tandai job ditangani?</DialogTitle>
            <DialogDescription>
              {jobName} tidak akan dikirim ulang dan tidak lagi menghalangi penutupan periode.
              Gunakan bila kegagalannya permanen dan sudah diselesaikan di luar antrean.
            </DialogDescription>
          </DialogHeader>

          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="catatan-penanganan">Catatan penanganan</FieldLabel>
            <Textarea
              id="catatan-penanganan"
              value={note}
              maxLength={NOTE_MAX}
              placeholder="Mis. nota sudah tercatat lewat transaksi lain, dicek di Etherscan"
              aria-invalid={error ? true : undefined}
              aria-describedby="catatan-penanganan-bantuan"
              className="h-[104px] field-sizing-fixed"
              onChange={(event) => {
                setNote(event.target.value);
                if (error) setError(null);
              }}
            />
            {error ? (
              <p id="catatan-penanganan-bantuan" role="alert" className="text-xs leading-4 text-destructive">
                {error}
              </p>
            ) : (
              <FieldDescription id="catatan-penanganan-bantuan">
                5 sampai 300 karakter. Tampil di tab Semua bersama namamu.
              </FieldDescription>
            )}
          </Field>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={submitting}>
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting} aria-busy={submitting}>
              {submitting ? (
                <CircleNotchIcon aria-hidden data-icon="inline-start" className="animate-spin" />
              ) : null}
              Tandai ditangani
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
