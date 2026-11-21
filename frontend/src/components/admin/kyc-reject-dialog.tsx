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

/** Batas alasan sama dengan backend: 3 sampai 300 karakter. */
const REASON_MIN = 3;
const REASON_MAX = 300;

interface KycRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investorName: string;
  submitting: boolean;
  /** Mengirim alasan ke backend. Mengembalikan pesan galat bila backend menolak. */
  onSubmit: (reason: string) => Promise<string | null>;
}

function validateReason(reason: string): string | null {
  const trimmed = reason.trim();
  if (!trimmed) return "Alasan wajib diisi supaya investor tahu apa yang harus diperbaiki.";
  if (trimmed.length < REASON_MIN) return `Alasan minimal ${REASON_MIN} karakter.`;
  return null;
}

/**
 * Dialog tolak KYC (Figma: "Dialog tolak KYC"). Alasan wajib karena investor
 * membacanya di halaman KYC dan bisa mengajukan lagi dengan data yang diperbaiki.
 */
export function KycRejectDialog({
  open,
  onOpenChange,
  investorName,
  submitting,
  onSubmit,
}: KycRejectDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setReason("");
      setError(null);
    }
    onOpenChange(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateReason(reason);
    setError(found);
    if (found) {
      document.getElementById("alasan-penolakan")?.focus();
      return;
    }
    const serverError = await onSubmit(reason.trim());
    if (serverError) setError(serverError);
    else {
      setReason("");
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Tolak pengajuan {investorName}?</DialogTitle>
            <DialogDescription>
              Investor membaca alasan ini dan bisa mengajukan lagi dengan data yang diperbaiki.
            </DialogDescription>
          </DialogHeader>

          <Field data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="alasan-penolakan">Alasan penolakan</FieldLabel>
            <Textarea
              id="alasan-penolakan"
              value={reason}
              maxLength={REASON_MAX}
              placeholder="Tulis alasan yang bisa diperbaiki investor"
              aria-invalid={error ? true : undefined}
              aria-describedby="alasan-penolakan-bantuan"
              className="h-[104px] field-sizing-fixed"
              onChange={(event) => {
                setReason(event.target.value);
                if (error) setError(null);
              }}
            />
            {error ? (
              <p
                id="alasan-penolakan-bantuan"
                role="alert"
                className="text-xs leading-4 text-destructive"
              >
                {error}
              </p>
            ) : (
              <FieldDescription id="alasan-penolakan-bantuan">
                Tampil di halaman KYC investor.
              </FieldDescription>
            )}
          </Field>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={submitting}>
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={submitting} aria-busy={submitting}>
              {submitting ? (
                <CircleNotchIcon aria-hidden data-icon="inline-start" className="animate-spin" />
              ) : null}
              Tolak pengajuan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
