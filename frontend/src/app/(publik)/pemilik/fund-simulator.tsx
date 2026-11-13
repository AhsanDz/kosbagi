"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { formatNumber, formatRupiah, formatSignedNumber } from "@/lib/format";

import {
  COUNT_MAX_DIGITS,
  PROPERTY_VALUE_MAX_DIGITS,
  RENT_MAX_DIGITS,
  displayPercent,
  displayRupiah,
  keepDigits,
  nextPercentDigits,
} from "./input-format";
import {
  MIN_PROPERTY_VALUE_IDR,
  SUMBERSARI_EXAMPLE,
  simulateFunds,
  type SimulationInput,
} from "./simulation";
import { useSimulationDraft } from "./simulation-draft";
import { TextField } from "./text-field";

type SimulationValues = Record<keyof SimulationInput, string>;
type SimulationErrors = Partial<Record<keyof SimulationInput, string>>;

const INITIAL_VALUES: SimulationValues = {
  roomCount: String(SUMBERSARI_EXAMPLE.roomCount),
  monthlyRentIdr: String(SUMBERSARI_EXAMPLE.monthlyRentIdr),
  occupancyPercent: String(SUMBERSARI_EXAMPLE.occupancyPercent),
  propertyValueIdr: String(SUMBERSARI_EXAMPLE.propertyValueIdr),
};

function validate(values: SimulationValues): SimulationErrors {
  const errors: SimulationErrors = {};
  if (Number(values.roomCount) < 1) errors.roomCount = "Isi jumlah kamar dengan angka.";
  if (Number(values.monthlyRentIdr) < 1) errors.monthlyRentIdr = "Isi sewa per kamar dengan angka.";
  if (!values.occupancyPercent || Number(values.occupancyPercent) > 100) {
    errors.occupancyPercent = "Isi okupansi dengan angka 0 sampai 100.";
  }
  if (Number(values.propertyValueIdr) < MIN_PROPERTY_VALUE_IDR) {
    errors.propertyValueIdr = `Nilai properti paling sedikit ${formatRupiah(MIN_PROPERTY_VALUE_IDR)}.`;
  }
  return errors;
}

/**
 * Simulasi dana (Figma: bagian "Simulasi dana"). Hasil dihitung saat menekan
 * Hitung ulang, seperti di desain. Panel hasil selalu memakai mode Gelap lewat
 * class "dark", di tema terang maupun gelap.
 */
export function FundSimulator() {
  const { setDraft } = useSimulationDraft();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [errors, setErrors] = useState<SimulationErrors>({});
  const [calculated, setCalculated] = useState(INITIAL_VALUES);

  const result = simulateFunds({
    roomCount: Number(calculated.roomCount),
    monthlyRentIdr: Number(calculated.monthlyRentIdr),
    occupancyPercent: Number(calculated.occupancyPercent),
    propertyValueIdr: Number(calculated.propertyValueIdr),
  });

  const rows = [
    { label: "Token diterbitkan", value: formatNumber(result.totalTokens) },
    { label: "Token ditawarkan (70%)", value: formatNumber(result.offeredTokens) },
    { label: "Dana penawaran", value: formatNumber(result.offeringFundsIdr) },
    { label: "Fee penawaran 3%", value: formatSignedNumber(-result.offeringFeeIdr) },
    { label: "Sewa kotor per tahun", value: formatNumber(result.annualGrossRentIdr) },
    { label: "Bagi hasil porsimu per bulan", value: `±${formatNumber(result.ownerMonthlyShareIdr)}` },
  ];

  function updateField(field: keyof SimulationInput, digits: string) {
    setValues((current) => ({ ...current, [field]: digits }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setCalculated(values);
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-6">
      <form
        noValidate
        onSubmit={handleSubmit}
        className="flex flex-col gap-5 rounded-2xl bg-card px-5 py-8 text-card-foreground lg:p-8"
      >
        <h3 className="text-h4 font-semibold">Data kos</h3>

        <div className="grid gap-4 md:grid-cols-2 md:gap-5">
          <TextField
            id="simulasi-kamar"
            label="Jumlah kamar"
            hint="Kamar yang disewakan, bukan kamar pemilik."
            inputMode="numeric"
            autoComplete="off"
            value={values.roomCount}
            error={errors.roomCount}
            onChange={(event) =>
              updateField("roomCount", keepDigits(event.target.value, COUNT_MAX_DIGITS))
            }
          />
          <TextField
            id="simulasi-sewa"
            label="Sewa per kamar per bulan"
            hint="Harga sewa rata-rata saat ini."
            inputMode="numeric"
            autoComplete="off"
            value={displayRupiah(values.monthlyRentIdr)}
            error={errors.monthlyRentIdr}
            onChange={(event) =>
              updateField("monthlyRentIdr", keepDigits(event.target.value, RENT_MAX_DIGITS))
            }
          />
          <TextField
            id="simulasi-okupansi"
            label="Okupansi rata-rata 12 bulan"
            hint="Persentase kamar terisi."
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
          <TextField
            id="simulasi-nilai"
            label="Nilai properti"
            hint="Untuk simulasi; nilai resmi ditetapkan penilai saat tahap 2."
            inputMode="numeric"
            autoComplete="off"
            value={displayRupiah(values.propertyValueIdr)}
            error={errors.propertyValueIdr}
            onChange={(event) =>
              updateField("propertyValueIdr", keepDigits(event.target.value, PROPERTY_VALUE_MAX_DIGITS))
            }
          />
        </div>

        <p className="rounded-md bg-muted px-4 py-3.5 text-sm leading-5 text-foreground">
          Porsi yang ditawarkan ke investor tetap 70% di prototipe ini; 30% tetap milikmu.
        </p>

        <Button type="submit" variant="outline" className="self-start">
          Hitung ulang
        </Button>
      </form>

      <section
        aria-labelledby="judul-hasil-simulasi"
        className="dark flex flex-col gap-5 rounded-2xl bg-background px-5 py-8 text-foreground lg:p-8 dark:border dark:border-border"
      >
        <h3 id="judul-hasil-simulasi" className="text-sm leading-5 font-semibold text-muted-foreground">
          Perkiraan dana diterima
        </h3>
        <p aria-live="polite" className="text-number-lg font-semibold tabular-nums">
          {formatRupiah(result.fundsReceivedIdr)}
        </p>
        <dl className="flex flex-col text-sm leading-5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-4 border-t border-border py-3">
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="font-mono tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs leading-4 text-muted-foreground">
          Asumsi: biaya operasional 20%, fee pengelolaan 5%, PPh badan 22%. Hanya simulasi, bukan
          penawaran resmi.
        </p>
        <Button asChild className="w-full">
          <a
            href="#ajukan"
            onClick={() =>
              setDraft({
                roomCount: calculated.roomCount,
                monthlyRentIdr: calculated.monthlyRentIdr,
                occupancyPercent: calculated.occupancyPercent,
              })
            }
          >
            Ajukan kos ini
          </a>
        </Button>
      </section>
    </div>
  );
}
