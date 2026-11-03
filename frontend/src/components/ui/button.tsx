import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

// Dikustom dari shadcn/ui (gaya radix-maia) mengikuti komponen "Button" Figma:
// tinggi 44 px, bentuk pill, label Geist SemiBold 15 px, tanpa panah.
// Varian: default = Primary (tinta), secondary, outline, ghost, destructive, link.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-transparent text-button font-semibold whitespace-nowrap transition-[background-color,border-color,color,opacity] outline-none select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/85",
        secondary:
          "border-border bg-card text-secondary-foreground hover:bg-muted aria-expanded:bg-muted",
        outline:
          "border-[1.5px] border-foreground bg-transparent text-foreground hover:bg-accent aria-expanded:bg-accent",
        ghost:
          "text-foreground hover:bg-accent aria-expanded:bg-accent",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "h-auto rounded-sm px-0 text-sm font-medium text-primary underline decoration-1 underline-offset-4 hover:decoration-2",
      },
      size: {
        default:
          "h-11 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-8 gap-1 px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-10 px-5 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        lg: "h-12 px-6 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-10 [&_svg:not([class*='size-'])]:size-5",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9",
        "icon-lg": "size-11 [&_svg:not([class*='size-'])]:size-6",
      },
    },
    compoundVariants: [
      // Tautan teks tidak memakai tinggi dan padding tombol.
      { variant: "link", size: "default", className: "h-auto px-0" },
      { variant: "link", size: "sm", className: "h-auto px-0" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
