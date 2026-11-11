"use client";

import { useRef, useState, type FormEvent } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { CheckCircleIcon, InfoIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

import {
  EMPTY_APPLICATION,
  submitApplication,
  validateApplication,
  type ApplicationErrors,
  type ApplicationField,
  type ApplicationValues,
  type SubmittedApplication,
} from "./application";
import {
  COUNT_MAX_DIGITS,
  RENT_MAX_DIGITS,
  displayPercent,
  displayRupiah,
  keepDigits,
  nextPercentDigits,
} from "./input-format";
import { useSimulationDraft } from "./simulation-draft";
import { TextField } from "./text-field";

const CARD_CLASS =
  "flex flex-col gap-5 rounded-2xl bg-card px-5 py-6 text-card-foreground lg:p-8";

const PROGRESS_STEPS = [
  "Penilaian dan dokumen",
  "Penerbitan token",
  "Penawaran ke investor",
  "Pengelolaan bulanan",
];

function withoutFields(errors: ApplicationErrors, fields: ApplicationField[]): ApplicationErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([field]) => !fields.includes(field as ApplicationField))
  );
}

/** Kartu "Pengajuan terkirim" yang menggantikan form setelah server menerima pengajuan. */
function SubmittedCard({ application }: { application: SubmittedApplication }) {
  const stages = [
    { label: "Pengajuan diterima", status: `Selesai, ${formatDate(application.submittedAt)}`, active: true },
    ...PROGRESS_STEPS.map((label, index) => ({
      label,
      status: index === 0 ? "Berikutnya" : "Menunggu",
      active: index === 0,
    })),
  ];

  return (
    <section
      aria-labelledby="judul-terkirim"
      className={CARD_CLASS}
      ref={(element) => element?.focus()}
      tabIndex={-1}
    >
      <CheckCircleIcon aria-hidden className="size-10 text-card-foreground" />
      <h3 id="judul-terkirim" className="text-h3 font-semibold">
        Pengajuan terkirim
      </h3>
      <p className="text-base leading-6 break-words text-muted-foreground">
        Tim KosBagi akan menghubungi {application.contact} paling lambat 2 hari kerja untuk
        menjadwalkan survei.
      </p>
      <p className="flex items-center justify-between gap-4 rounded-md bg-muted px-4 py-3.5 text-sm leading-5">
        <span className="text-muted-foreground">Nomor pengajuan</span>
        <span className="font-mono text-foreground">{application.applicationNumber}</span>
      </p>
      <ol className="flex flex-col">
        {stages.map((stage) => (
          <li
            key={stage.label}
            className={cn(
              "flex items-start justify-between gap-4 border-t border-border py-3",
              stage.active ? "text-card-foreground" : "text-muted-foreground"
            )}
          >
            <span className={cn("text-sm leading-5", stage.active && "font-semibold")}>
              {stage.label}
            </span>
            <span className="text-xs leading-4 font-medium whitespace-nowrap">{stage.status}</span>
          </li>
        ))}
      </ol>
      <Button asChild variant="outline" className="self-start">
        <Link href="/">Kembali ke beranda</Link>
      </Button>
    </section>
  );
}

/**
 * Form pengajuan kos (Figma: Form pengajuan, Form error, Pengajuan terkirim).
 * Validasi di klien mengikuti kontrak POST /api/owner-applications. Galat dari
 * server tampil per field memakai nama field yang sama.
 */
export function ApplicationForm() {
  const { draft } = useSimulationDraft();
  const [values, setValues] = useState(EMPTY_APPLICATION);
  const [errors, setErrors] = useState<ApplicationErrors>({});
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<SubmittedApplication | null>(null);
  const [appliedDraft, setAppliedDraft] = useState(draft);
  const cardRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  // Isian dari simulator dipakai saat "Ajukan kos ini" ditekan, tanpa menyentuh isian lain.
  if (draft !== appliedDraft) {
    setAppliedDraft(draft);
    if (draft) {
      setValues((current) => ({ ...current, ...draft }));
      setErrors((current) =>
        withoutFields(current, ["roomCount", "monthlyRentIdr", "occupancyPercent"])
      );
    }
  }

  const errorCount = Object.keys(errors).length;

  function updateField<Name extends ApplicationField>(field: Name, value: ApplicationValues[Name]) {
    setValues((current) => ({ ...current, [field]: value }));
    setFailureMessage(null);
    if (errors[field]) setErrors((current) => withoutFields(current, [field]));
  }

  /**
   * flushSync memastikan pesan galat sudah dirender sebelum fokus dipindahkan. Halaman
   * digulir ke kepala kartu supaya ringkasan galat tetap terlihat, tidak tertutup navbar.
   */
  function showErrors(nextErrors: ApplicationErrors) {
    flushSync(() => setErrors(nextErrors));
    cardRef.current?.scrollIntoView({ block: "start" });
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus({ preventScroll: true });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setFailureMessage(null);
    const nextErrors = validateApplication(values);
    if (Object.keys(nextErrors).length > 0) {
      showErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    const outcome = await submitApplication(values);
    setIsSubmitting(false);

    if (outcome.kind === "success") {
      setSubmitted(outcome.application);
    } else if (outcome.kind === "invalid") {
      showErrors(outcome.errors);
    } else {
      flushSync(() => setFailureMessage(outcome.message));
      alertRef.current?.focus();
    }
  }

  if (submitted) return <SubmittedCard application={submitted} />;

  return (
    <section ref={cardRef} aria-labelledby="judul-form-kos" className={CARD_CLASS}>
      <h3 id="judul-form-kos" className="text-h4 font-semibold">
        Data kos
      </h3>

      {errorCount > 0 ? (
        <Alert variant="destructive">
          <WarningCircleIcon aria-hidden />
          <AlertTitle>Periksa {errorCount} isian yang ditandai</AlertTitle>
          <AlertDescription>Pengajuan belum terkirim. Lengkapi isian lalu kirim lagi.</AlertDescription>
        </Alert>
      ) : null}

      {failureMessage ? (
        <Alert variant="destructive" ref={alertRef} tabIndex={-1} className="outline-none">
          <WarningCircleIcon aria-hidden />
          <AlertTitle>Pengajuan belum terkirim</AlertTitle>
          <AlertDescription>{failureMessage}</AlertDescription>
        </Alert>
      ) : null}

      <form ref={formRef} noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField
          id="ajukan-nama"
          name="ownerName"
          label="Nama pemilik"
          hint="Pakai nama dummy."
          placeholder="Rahmat Hidayat (dummy)"
          autoComplete="off"
          maxLength={120}
          value={values.ownerName}
          error={errors.ownerName}
          onChange={(event) => updateField("ownerName", event.target.value)}
        />
        <TextField
          id="ajukan-kontak"
          name="contact"
          label="WhatsApp atau email"
          hint="Kami menghubungimu lewat kontak ini."
          placeholder="rahmat.dummy@kosbagi.test"
          autoComplete="off"
          spellCheck={false}
          maxLength={120}
          value={values.contact}
          error={errors.contact}
          onChange={(event) => updateField("contact", event.target.value)}
        />
        <TextField
          id="ajukan-alamat"
          name="propertyAddress"
          label="Alamat kos"
          hint="Cukup nama jalan dan kelurahan."
          placeholder="Jl. Kertoraharjo (dummy), Malang"
          autoComplete="off"
          maxLength={200}
          value={values.propertyAddress}
          error={errors.propertyAddress}
          onChange={(event) => updateField("propertyAddress", event.target.value)}
        />
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <TextField
            id="ajukan-kamar"
            name="roomCount"
            label="Jumlah kamar"
            hint="Kamar yang disewakan."
            placeholder="12"
            inputMode="numeric"
            autoComplete="off"
            value={values.roomCount}
            error={errors.roomCount}
            onChange={(event) =>
              updateField("roomCount", keepDigits(event.target.value, COUNT_MAX_DIGITS))
            }
          />
          <TextField
            id="ajukan-sewa"
            name="monthlyRentIdr"
            label="Sewa per kamar per bulan"
            hint="Rata-rata saat ini."
            placeholder="Rp1.300.000"
            inputMode="numeric"
            autoComplete="off"
            value={displayRupiah(values.monthlyRentIdr)}
            error={errors.monthlyRentIdr}
            onChange={(event) =>
              updateField("monthlyRentIdr", keepDigits(event.target.value, RENT_MAX_DIGITS))
            }
          />
        </div>
        <TextField
          id="ajukan-okupansi"
          name="occupancyPercent"
          label="Okupansi rata-rata 12 bulan"
          hint="Perkiraan juga boleh."
          placeholder="85%"
          inputMode="numeric"
          autoComplete="off"
          value={displayPercent(values.occupancyPercent)}
          error={errors.occupancyPercent}
          onChange={(event) =>
            updateField(
              "occupancyPercent",
              nextPercentDigits(event.target.value, values.occupancyPercent)
            )
          }
        />

        <Field data-invalid={errors.consent ? true : undefined} className="gap-5">
          <div className="flex items-start gap-3">
            <Checkbox
              id="ajukan-setuju"
              checked={values.consent}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? "ajukan-setuju-galat" : undefined}
              onCheckedChange={(checked) => updateField("consent", checked === true)}
            />
            <FieldLabel
              htmlFor="ajukan-setuju"
              className="max-w-[360px] text-sm leading-5 font-normal text-foreground"
            >
              Saya memakai data dummy dan setuju dihubungi tim KosBagi.
            </FieldLabel>
          </div>
          {errors.consent ? (
            <FieldError id="ajukan-setuju-galat" className="gap-1.5">
              {errors.consent}
            </FieldError>
          ) : null}
        </Field>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Mengirim pengajuan..." : "Kirim pengajuan"}
        </Button>
      </form>

      <p className="flex gap-2 text-xs leading-4 text-muted-foreground">
        <InfoIcon aria-hidden className="size-4 shrink-0" />
        Data dummy saja. Jangan memasukkan nama, nomor, atau alamat asli.
      </p>
    </section>
  );
}
