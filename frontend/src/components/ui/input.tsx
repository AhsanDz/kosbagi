import * as React from "react"
import { cn } from "@/lib/utils"

// Dikustom mengikuti komponen "Field" Figma: tinggi 44 px, radius md (12),
// latar kartu, garis --input. Fokus: garis tinta + cincin 2 px berjarak 2 px.
// Galat (aria-invalid): garis destructive.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 py-2 text-base text-foreground transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
