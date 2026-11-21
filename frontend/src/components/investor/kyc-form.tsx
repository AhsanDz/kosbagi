"use client";

import { useState, type FormEvent } from "react";
import { CircleNotchIcon, InfoIcon } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldErrors, toApiError } from "@/lib/api/client";
import { submitKyc } from "@/lib/api/kyc";
import type { KycDto } from "@/lib/api/types";
import {
  KYC_NAME_MAX,
  validateKycForm,
  type KycFormErrors,
  type KycFormValues,
} from "@/lib/kyc";
import { cn } from "@/lib/utils";

interface KycFormProps {
  /** "first" untuk pengajuan pertama, "retry" untuk Ajukan lagi setelah ditolak. */
  mode: "first" | "retry";
  defaultValues: Pick<KycFormValues, "fullName" | "dummyIdNumber">;
  onSubmitted: (kyc: KycDto) => void;
  /** Dipanggil saat backend menyebut sudah ada pengajuan yang berlaku. */
  onStale: () => void;
  className?: string;
}

/**
 * Form KYC dummy (Figma: "Form KYC"). Hanya dua isian sesuai backend ditambah
 * centang data dummy. Validasi nomor identitas sama dengan backend: harus
 * berawalan DUMMY-. Galat dari backend ditampilkan di bawah isian yang salah.
 */
export function KycForm({ mode, defaultValues, onSubmitted, onStale, className }: KycFormProps) {
  const [values, setValues] = useState<KycFormValues>({ ...defaultValues, confirmed: false });
  const [errors, setErrors] = useState<KycFormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const retry = mode === "retry";

  function update<K extends keyof KycFormValues>(key: K, value: KycFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    // Galat isian hilang begitu isian diubah; validasi ulang terjadi saat mengirim.
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateKycForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const firstInvalid = (["fullName", "dummyIdNumber", "confirmed"] as const).find(
        (key) => found[key]
      );
      document.getElementById(`kyc-${firstInvalid}`)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const { kyc } = await submitKyc({
        fullName: values.fullName.trim(),
        dummyIdNumber: values.dummyIdNumber.trim(),
      });
      toast.success("Pengajuan KYC terkirim", {
        description: "Admin akan meninjau data dummy-mu.",
      });
      onSubmitted(kyc);
    } catch (error) {
      const apiError = toApiError(error);
      const serverErrors = fieldErrors(apiError);
      if (serverErrors.fullName || serverErrors.dummyIdNumber) {
        setErrors({ fullName: serverErrors.fullName, dummyIdNumber: serverErrors.dummyIdNumber });
      } else {
        toast.error("Pengajuan belum terkirim", { description: apiError.message });
      }
      if (apiError.code === "KYC_ALREADY_SUBMITTED") onStale();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      aria-labelledby="judul-form-kyc"
      className={cn(
        "flex flex-col gap-5 rounded-xl bg-card px-5 pt-7 pb-8 text-card-foreground md:px-8",
        className
      )}
    >
      <div className="flex flex-col gap-1.5">
        <h2 id="judul-form-kyc" className="text-h4 font-semibold">
          {retry ? "Ajukan lagi" : "Data identitas dummy"}
        </h2>
        <p className="text-sm leading-5 text-muted-foreground">
          Isi dengan data contoh. KosBagi tidak meminta foto KTP, nomor KTP, atau nomor rekening
          asli.
        </p>
      </div>

      {retry ? null : (
        <Alert variant="info">
          <InfoIcon aria-hidden />
          <AlertTitle>Gunakan data dummy</AlertTitle>
          <AlertDescription>
            Nomor identitas harus berawalan DUMMY-. Jangan memasukkan nama atau nomor KTP asli.
          </AlertDescription>
        </Alert>
      )}

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FieldGroup>
          <Field data-invalid={errors.fullName ? true : undefined}>
            <FieldLabel htmlFor="kyc-fullName">Nama lengkap</FieldLabel>
            <Input
              id="kyc-fullName"
              name="fullName"
              autoComplete="off"
              maxLength={KYC_NAME_MAX}
              value={values.fullName}
              aria-invalid={errors.fullName ? true : undefined}
              aria-describedby="kyc-fullName-bantuan"
              onChange={(event) => update("fullName", event.target.value)}
            />
            {errors.fullName ? (
              <FieldError id="kyc-fullName-bantuan">{errors.fullName}</FieldError>
            ) : (
              <FieldDescription id="kyc-fullName-bantuan">
                Samakan dengan nama akun dummy kamu.
              </FieldDescription>
            )}
          </Field>

          <Field data-invalid={errors.dummyIdNumber ? true : undefined}>
            <FieldLabel htmlFor="kyc-dummyIdNumber">Nomor identitas dummy</FieldLabel>
            <Input
              id="kyc-dummyIdNumber"
              name="dummyIdNumber"
              autoComplete="off"
              spellCheck={false}
              maxLength={46}
              value={values.dummyIdNumber}
              aria-invalid={errors.dummyIdNumber ? true : undefined}
              aria-describedby="kyc-dummyIdNumber-bantuan"
              onChange={(event) => update("dummyIdNumber", event.target.value)}
            />
            {errors.dummyIdNumber ? (
              <FieldError id="kyc-dummyIdNumber-bantuan">{errors.dummyIdNumber}</FieldError>
            ) : (
              <FieldDescription id="kyc-dummyIdNumber-bantuan">
                Harus berawalan DUMMY-, misalnya DUMMY-0042.
              </FieldDescription>
            )}
          </Field>

          <div className="flex flex-col gap-2">
            <Field
              orientation="horizontal"
              data-invalid={errors.confirmed ? true : undefined}
              className="items-start gap-3"
            >
              <Checkbox
                id="kyc-confirmed"
                checked={values.confirmed}
                aria-invalid={errors.confirmed ? true : undefined}
                aria-describedby={errors.confirmed ? "kyc-confirmed-galat" : undefined}
                onCheckedChange={(checked) => update("confirmed", checked === true)}
              />
              <Label htmlFor="kyc-confirmed" className="block min-w-0 flex-1 font-normal">
                Saya memakai data dummy, bukan data pribadi asli.
              </Label>
            </Field>
            {errors.confirmed ? (
              <FieldError id="kyc-confirmed-galat" className="pl-[30px]">
                {errors.confirmed}
              </FieldError>
            ) : null}
          </div>
        </FieldGroup>

        <Button type="submit" className="self-start" disabled={submitting} aria-busy={submitting}>
          {submitting ? (
            <CircleNotchIcon aria-hidden data-icon="inline-start" className="animate-spin" />
          ) : null}
          {retry ? "Ajukan lagi" : "Ajukan verifikasi"}
        </Button>
      </form>
    </section>
  );
}
