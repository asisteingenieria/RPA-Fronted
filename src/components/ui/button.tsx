import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/**
 * Botones del kit Asiste · Agente RPA: primary (una por zona) · secondary · ghost · destructive
 * (solo apagado y acciones destructivas) · danger-ghost (Deshabilitar, Desactivar) · navy · on-navy.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent font-sans text-[13px] leading-4 font-semibold whitespace-nowrap transition-[background,border-color,box-shadow,filter] outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-card hover:bg-primary-hover",
        secondary: "border-border bg-surface-100 text-ink hover:border-border-strong hover:bg-surface-200",
        outline: "border-border bg-surface-100 text-ink hover:border-border-strong hover:bg-surface-200",
        ghost: "bg-transparent text-primary-soft-ink hover:bg-primary-soft",
        destructive: "bg-danger-solid text-primary-foreground shadow-card hover:brightness-90",
        "danger-ghost": "border-danger bg-transparent text-danger hover:bg-danger-soft",
        navy: "bg-navy text-on-navy hover:bg-primary-hover",
        "on-navy": "border-on-navy-line bg-on-navy-soft text-on-navy hover:bg-navy-active",
        link: "h-auto border-0 bg-transparent p-0 text-primary-soft-ink hover:underline",
      },
      size: {
        default: "h-[38px] px-4",
        sm: "h-8 px-3 text-xs",
        xl: "h-[52px] w-full px-6 text-[15px] [&_svg:not([class*='size-'])]:size-[18px]",
        icon: "size-9",
        "icon-sm": "size-8 rounded-sm",
      },
    },
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
