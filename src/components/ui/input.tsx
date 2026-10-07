import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-border-strong bg-surface-100 px-3 text-sm text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-subtle disabled:cursor-not-allowed disabled:bg-surface-200 disabled:text-ink-muted read-only:bg-surface-200",
        "focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary-soft",
        "aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  )
}

export { Input }
