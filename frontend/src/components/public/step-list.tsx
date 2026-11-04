import { cn } from "@/lib/utils";

export interface Step {
  title: string;
  description: string;
}

/**
 * Daftar langkah berangka raksasa (Figma: komponen "Langkah"). Isinya memang
 * urutan, jadi memakai <ol>. Ponsel: angka 64 px di samping teks (Samping);
 * tablet ke atas: angka 128 px di atas teks (Atas), semua langkah satu baris di desktop.
 */
export function StepList({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol
      className={cn(
        "grid gap-7 md:grid-cols-2 md:gap-x-12 md:gap-y-14 lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none",
        className
      )}
    >
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-4 md:flex-col md:gap-5">
          <span
            aria-hidden
            className="font-display text-display-section font-black text-foreground md:text-display-number"
          >
            {index + 1}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="text-h5 font-semibold text-foreground">
              <span className="sr-only">Langkah {index + 1}: </span>
              {step.title}
            </h3>
            <p className="text-sm leading-5 text-muted-foreground">{step.description}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
