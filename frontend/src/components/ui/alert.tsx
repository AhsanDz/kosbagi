import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

// Dikustom mengikuti komponen "Alert" Figma: latar token *-muted, radius lg (16),
// ikon 18 px, judul SemiBold dan isi Regular dengan warna yang sama.
const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg px-4 py-3 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-3 *:[svg]:row-span-2 *:[svg]:translate-y-px *:[svg]:text-current *:[svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: "border border-border bg-card text-card-foreground",
        info: "bg-info-muted text-info-muted-foreground",
        success: "bg-success-muted text-success-muted-foreground",
        warning: "bg-warning-muted text-warning-muted-foreground",
        destructive: "bg-destructive-muted text-destructive-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  role,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      data-variant={variant}
      // Hanya pesan galat yang diumumkan segera ke pembaca layar.
      role={role ?? (variant === "destructive" ? "alert" : "status")}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "leading-5 font-semibold group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm leading-5 text-current group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2.5 right-3", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
