import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[72px] w-full rounded-md border border-border-strong bg-surface-100 px-3 py-2.5 text-[13.5px] leading-5 text-ink outline-none transition-[border-color,box-shadow] placeholder:text-ink-subtle focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary-soft disabled:cursor-not-allowed disabled:bg-surface-200 disabled:text-ink-muted read-only:bg-surface-200 read-only:text-ink-muted aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
