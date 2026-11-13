import type { ComponentProps } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface TextFieldProps extends ComponentProps<typeof Input> {
  id: string;
  label: string;
  hint: string;
  /** Bila terisi, pesan ini menggantikan teks bantuan. */
  error?: string;
}

/** Label di atas, isian, lalu teks bantuan atau pesan galat (Figma: komponen "Field"). */
export function TextField({ id, label, hint, error, placeholder, ...inputProps }: TextFieldProps) {
  const messageId = `${id}-bantuan`;

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id} className="leading-5">
        {label}
      </FieldLabel>
      <Input
        id={id}
        // Isian bergalat tampil kosong, supaya contoh tidak terbaca sebagai nilai yang sudah terisi.
        placeholder={error ? undefined : placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        {...inputProps}
      />
      {error ? (
        <FieldError id={messageId}>{error}</FieldError>
      ) : (
        <FieldDescription id={messageId}>{hint}</FieldDescription>
      )}
    </Field>
  );
}
