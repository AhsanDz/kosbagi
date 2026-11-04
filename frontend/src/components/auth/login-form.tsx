"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import { InfoIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { findDemoAccountByEmail } from "@/lib/data/demo-accounts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CREDENTIAL_HINT = "Periksa email dan kata sandi.";

interface FieldErrors {
  email?: string;
  password?: string;
}

/**
 * Form masuk dengan email (Figma: Masuk / Default dan Masuk / Error).
 * Progress 1 belum punya login sungguhan: email akun demo langsung membuka
 * app shell perannya, email lain menampilkan state error. Mulai progress 2
 * form ini memanggil POST /api/auth/login dan menyimpan sesi.
 */
export function LoginForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [credentialError, setCredentialError] = useState(false);
  const alertRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const emailError = errors.email ?? (credentialError ? CREDENTIAL_HINT : undefined);
  const passwordError = errors.password ?? (credentialError ? CREDENTIAL_HINT : undefined);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const name = event.target.name as keyof FieldErrors;
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
    if (credentialError) setCredentialError(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const next: FieldErrors = {};
    if (!email) next.email = "Isi email akun demo.";
    else if (!EMAIL_PATTERN.test(email))
      next.email = "Format email belum benar, contoh: investor.dummy@kosbagi.test.";
    if (!password) next.password = "Isi kata sandi.";

    if (next.email || next.password) {
      setCredentialError(false);
      setErrors(next);
      (next.email ? emailRef : passwordRef).current?.focus();
      return;
    }

    const account = findDemoAccountByEmail(email);
    if (!account) {
      // flushSync memastikan Alert sudah dirender sebelum fokus dipindahkan ke sana.
      flushSync(() => {
        setErrors({});
        setCredentialError(true);
      });
      alertRef.current?.focus();
      return;
    }

    router.push(account.homeHref);
  }

  return (
    <section
      aria-labelledby="judul-form-email"
      className="flex flex-col gap-5 rounded-2xl bg-card p-6 text-card-foreground sm:p-8"
    >
      <h2 id="judul-form-email" className="text-h4 font-semibold">
        Atau masuk dengan email
      </h2>

      {credentialError ? (
        <Alert variant="destructive" ref={alertRef} tabIndex={-1} className="outline-none">
          <WarningCircleIcon aria-hidden />
          <AlertTitle>Email atau kata sandi salah</AlertTitle>
          <AlertDescription>
            Periksa lagi data akun demo, atau pilih salah satu kartu peran.
          </AlertDescription>
        </Alert>
      ) : null}

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FieldGroup>
          <Field data-invalid={emailError ? true : undefined}>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              ref={emailRef}
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              spellCheck={false}
              placeholder="investor.dummy@kosbagi.test"
              aria-invalid={emailError ? true : undefined}
              aria-describedby="email-bantuan"
              onChange={handleChange}
            />
            {emailError ? (
              <FieldError id="email-bantuan">{emailError}</FieldError>
            ) : (
              <FieldDescription id="email-bantuan">
                Gunakan email dummy dari daftar akun demo.
              </FieldDescription>
            )}
          </Field>

          <Field data-invalid={passwordError ? true : undefined}>
            <FieldLabel htmlFor="password">Kata sandi</FieldLabel>
            <Input
              ref={passwordRef}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={passwordError ? true : undefined}
              aria-describedby="password-bantuan"
              onChange={handleChange}
            />
            {passwordError ? (
              <FieldError id="password-bantuan">{passwordError}</FieldError>
            ) : (
              <FieldDescription id="password-bantuan">
                Akun demo: kata sandi boleh diisi apa saja untuk saat ini.
              </FieldDescription>
            )}
          </Field>
        </FieldGroup>

        <Button type="submit" className="w-full">
          Masuk
        </Button>
      </form>

      <p className="flex gap-2 text-xs leading-4 text-muted-foreground">
        <InfoIcon aria-hidden className="size-4 shrink-0" />
        Akun demo hanya untuk prototipe. Jangan memakai email atau kata sandi asli.
      </p>
    </section>
  );
}
